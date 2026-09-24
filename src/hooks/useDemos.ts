import { useCallback, useEffect, useRef, useState } from 'react';
import type { LaunchPrompt } from '../components/LaunchModal';
import type { DemoStatus, LaunchResult } from '../types/electron';
import { catalog } from '../config/catalog';
import { captureLog } from '../services/diagnostic-logger';
import { uploadLogs } from '../services/log-uploader';

const STORAGE_KEY = 'voyant-demo-paths';
const WINDOW_POLL_MS = 400;
const WINDOW_WAIT_MS = 25_000;

// Watches for the demo's window (not just its process) so the launching overlay
// clears at the moment the app is actually on screen.
async function waitForWindow(id: string, onOpen: () => void) {
  if (!window.electronAPI) return;
  const started = Date.now();
  while (Date.now() - started < WINDOW_WAIT_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, WINDOW_POLL_MS));
    const items = await window.electronAPI.listDemos({ force: true });
    const item = items.find((demo) => demo.id === id);
    if (item?.hasWindow) {
      onOpen();
      return;
    }
  }
  onOpen();
}

function loadBrowserOverrides(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBrowserOverride(id: string, nextPath: string) {
  const all = loadBrowserOverrides();
  all[id] = nextPath;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function catalogDemos(): DemoStatus[] {
  const overrides = loadBrowserOverrides();
  return catalog.demos.map((demo) => {
    const configured = demo.kind === 'url' ? demo.url ?? '' : demo.path ?? '';
    const path = demo.kind === 'exe' && overrides[demo.id] ? overrides[demo.id] : configured;
    return {
      id: demo.id,
      label: demo.label,
      category: demo.category,
      kind: demo.kind as DemoStatus['kind'],
      path,
      exists: demo.kind === 'url',
      running: [],
    };
  });
}

export function useDemos() {
  const [demos, setDemos] = useState<DemoStatus[]>(() => catalogDemos());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<LaunchPrompt | null>(null);
  const launchRef = useRef<(id: string) => Promise<unknown>>(async () => undefined);

  const refresh = useCallback(async () => {
    if (!window.electronAPI) {
      setDemos(catalogDemos());
      return;
    }
    const next = await window.electronAPI.listDemos();
    setDemos(next);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const describe = (result: LaunchResult) => {
    if (result.ok && result.action === 'focused') return 'Brought the running app to the front.';
    if (result.ok && result.action === 'launched' && result.stillRunning === false) {
      return 'The application started and then exited.';
    }
    if (result.ok && result.action === 'launched') return 'Launched the installed application.';
    if (result.reason === 'exited') return 'The application started and then exited.';
    if (result.reason === 'spawn-failed') return result.error || 'The application failed to start.';
    if (result.ok && result.kind === 'url') return 'Opened in your browser.';
    if (result.reason === 'missing') return `Not installed at ${result.path ?? 'the configured path'}.`;
    if (result.reason === 'not-running') return 'That application is not running.';
    if (result.error) return result.error;
    return result.ok ? 'Done.' : 'Could not launch this item.';
  };

  const demoFor = useCallback((id: string) => {
    return demos.find((item) => item.id === id) ?? catalogDemos().find((item) => item.id === id);
  }, [demos]);

  const openPrompt = (id: string, reason: LaunchPrompt['reason'], fallbackPath?: string) => {
    const demo = demoFor(id);
    if (!demo) return;
    setMessage(null);
    setPrompt({
      id: demo.id,
      label: demo.label,
      path: fallbackPath || demo.path,
      reason,
    });
  };

  // Switching to a window the user can already see must never be gated on a
  // launch, so this runs before anything slow and returns as soon as it wins.
  const activate = useCallback(async (id: string): Promise<void> => {
    const demo = demoFor(id);
    captureLog('launch', 'card-clicked', id, demo?.path ?? '');
    if (!window.electronAPI || demo?.kind !== 'exe') {
      await launchRef.current(id);
      return;
    }
    const switched = await window.electronAPI.switchDemo(id);
    captureLog('launch', 'switch-result', id, switched);
    if (switched.ok) {
      setMessage('Brought the running app to the front.');
      void refresh();
      return;
    }
    if (switched.reason === 'starting') {
      setMessage('That app is still opening.');
      setOpeningId(id);
      void waitForWindow(id, () => {
        setOpeningId((current) => (current === id ? null : current));
        void refresh();
      });
      return;
    }
    await launchRef.current(id);
  }, [demoFor, refresh]);

  const launch = useCallback(async (id: string) => {
    setBusyId(id);
    const demo = demoFor(id);
    try {
      if (!window.electronAPI) {
        if (demo?.kind === 'url' && demo.path) {
          window.open(demo.path, '_blank', 'noopener');
          setMessage('Opened in your browser.');
          void uploadLogs('launch-url-browser', { demoId: id, url: demo.path });
          return;
        }
        captureLog('launch', 'browser-showed-picker', id);
        void uploadLogs('picker-shown', {
          demoId: id,
          runtime: 'web',
          reason: 'desktop-app',
          configuredPath: demo?.path ?? null,
          launched: false,
        });
        openPrompt(id, 'desktop-app');
        return;
      }
      const result = await window.electronAPI.launchDemo(id);
      captureLog('launch', 'electron-result', result);
      if (result.ok && demo?.kind === 'exe') {
        setOpeningId(id);
        void waitForWindow(id, () => {
          setOpeningId((current) => (current === id ? null : current));
          void refresh();
        });
      }
      if (!result.ok && (result.reason === 'missing' || result.reason === 'unknown-demo')) {
        void uploadLogs('picker-shown', {
          demoId: id,
          runtime: 'electron',
          reason: result.reason,
          path: result.path ?? null,
          launched: false,
        });
        openPrompt(id, 'missing', result.path);
        return;
      }
      void uploadLogs(result.ok ? 'launch-result' : 'launch-failed', {
        demoId: id,
        runtime: 'electron',
        result,
        launched: Boolean(result.ok && result.action === 'launched'),
        stillRunning: result.stillRunning ?? null,
        showedPicker: false,
      });
      setMessage(describe(result));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [demoFor, refresh]);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const browsePromptPath = useCallback(async () => {
    if (!prompt) return null;
    if (!window.electronAPI?.pickDemoExe) return null;
    captureLog('launch', 'picker-browse', prompt.id);
    const picked = await window.electronAPI.pickDemoExe(prompt.id);
    if (!picked.ok || !picked.resolvedPath) {
      captureLog('launch', 'picker-canceled-or-empty', prompt.id, picked);
      return null;
    }
    captureLog('launch', 'picker-picked', prompt.id, picked.resolvedPath);
    saveBrowserOverride(prompt.id, picked.resolvedPath);
    await refresh();
    return picked.resolvedPath;
  }, [prompt, refresh]);

  const launchFromPrompt = useCallback(async (nextPath: string) => {
    if (!prompt) return;
    saveBrowserOverride(prompt.id, nextPath);
    setBusyId(prompt.id);
    try {
      if (!window.electronAPI) {
        captureLog('launch', 'browser-path-saved-no-launch', prompt.id, nextPath);
        void uploadLogs('picker-picked-browser', {
          demoId: prompt.id,
          runtime: 'web',
          path: nextPath,
          launched: false,
        });
        setPrompt((current) => (current ? { ...current, path: nextPath } : current));
        setMessage('Path saved. Open this hub in the desktop app to launch local EXEs.');
        return;
      }
      await window.electronAPI.setDemoPath(prompt.id, nextPath);
      const result = await window.electronAPI.launchDemo(prompt.id);
      captureLog('launch', 'launch-from-picker', prompt.id, result);
      if (result.ok) {
        const id = prompt.id;
        setOpeningId(id);
        void waitForWindow(id, () => {
          setOpeningId((current) => (current === id ? null : current));
          void refresh();
        });
      }
      void uploadLogs(result.ok ? 'launch-from-picker' : 'launch-from-picker-failed', {
        demoId: prompt.id,
        runtime: 'electron',
        path: nextPath,
        result,
        launched: Boolean(result.ok && result.action === 'launched'),
        stillRunning: result.stillRunning ?? null,
      });
      if (!result.ok && result.reason === 'missing') {
        setPrompt((current) => (current ? { ...current, path: nextPath, reason: 'missing' } : current));
        setMessage(null);
        return;
      }
      setPrompt(null);
      setMessage(describe(result));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [prompt, refresh]);

  const focus = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    setBusyId(id);
    try {
      const result = await window.electronAPI.focusDemo(id);
      setMessage(describe(result));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const quit = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    setBusyId(id);
    try {
      const result = await window.electronAPI.quitDemo(id);
      setMessage(describe(result));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  return {
    demos,
    busyId,
    openingId,
    activate,
    message,
    setMessage,
    prompt,
    closePrompt: () => setPrompt(null),
    browsePromptPath,
    launchFromPrompt,
    launch,
    focus,
    quit,
    refresh,
    categories: catalog.categories,
  };
}
