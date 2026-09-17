import { useCallback, useEffect, useState } from 'react';
import type { LaunchPrompt } from '../components/LaunchModal';
import type { DemoStatus, LaunchResult } from '../types/electron';
import { catalog } from '../config/catalog';

const STORAGE_KEY = 'voyant-demo-paths';

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
  const [message, setMessage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<LaunchPrompt | null>(null);

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
    if (result.ok && result.action === 'launched') return 'Launched the installed application.';
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

  const launch = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      if (!window.electronAPI) {
        const demo = demoFor(id);
        if (demo?.kind === 'url' && demo.path) {
          window.open(demo.path, '_blank', 'noopener');
          setMessage('Opened in your browser.');
          return;
        }
        openPrompt(id, 'desktop-app');
        return;
      }
      const result = await window.electronAPI.launchDemo(id);
      if (!result.ok && (result.reason === 'missing' || result.reason === 'unknown-demo')) {
        openPrompt(id, 'missing', result.path);
        return;
      }
      setMessage(describe(result));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }, [demoFor, refresh]);

  const browsePromptPath = useCallback(async () => {
    if (!prompt) return null;
    if (!window.electronAPI?.pickDemoExe) return null;
    const picked = await window.electronAPI.pickDemoExe(prompt.id);
    if (!picked.ok || !picked.resolvedPath) return null;
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
        setPrompt((current) => (current ? { ...current, path: nextPath } : current));
        setMessage('Path saved. Open this hub in the desktop app to launch local EXEs.');
        return;
      }
      await window.electronAPI.setDemoPath(prompt.id, nextPath);
      const result = await window.electronAPI.launchDemo(prompt.id);
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
