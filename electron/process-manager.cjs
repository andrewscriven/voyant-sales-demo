const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const catalog = require('../shared/demos.json');
const launchLog = require('./launch-log.cjs');
const diagnose = require('./diagnose-exe.cjs');
const winHelper = require('./win-helper.cjs');

const SNAPSHOT_CACHE_MS = 600;
let cachedSnapshot = null;
let cachedAt = 0;

let snapshotUserDataPath = null;

async function getSnapshot(force = false) {
  if (!force && cachedSnapshot && Date.now() - cachedAt < SNAPSHOT_CACHE_MS) {
    return cachedSnapshot;
  }
  try {
    const snapshot = await winHelper.snapshot();
    cachedSnapshot = snapshot;
    cachedAt = Date.now();
    return snapshot;
  } catch (err) {
    // A dead or wedged worker returns nothing, which otherwise reads as "no demo
    // is running" and triggers a duplicate launch. Record it so the log can tell
    // the two cases apart.
    launchLog.appendLaunchLog(snapshotUserDataPath, {
      event: 'snapshot-error',
      error: String((err && err.message) || err),
    });
    throw err;
  }
}

function samePath(a, b) {
  if (!a || !b) return false;
  return path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase();
}

// Electron demos run several processes off one EXE and only one of them owns the
// window, so match on the EXE path rather than a single PID.
function windowsForPath(snapshot, exePath) {
  return snapshot.windows.filter((win) => samePath(win.path, exePath));
}

function processesForPath(snapshot, exePath) {
  return snapshot.processes.filter((proc) => samePath(proc.path, exePath));
}

function runPs(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message || '').toString().trim() || 'PowerShell failed'));
          return;
        }
        resolve(String(stdout || '').trim());
      }
    );
  });
}

function normalizePath(filePath) {
  return path.normalize(filePath).replace(/[\\/]+$/, '');
}

function escapePs(value) {
  return String(value).replace(/'/g, "''");
}

function getCatalog() {
  return catalog;
}

function loadOverrides(userDataPath) {
  const file = path.join(userDataPath, 'demo-paths.json');
  try {
    if (!fs.existsSync(file)) return {};
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverrides(userDataPath, overrides) {
  const file = path.join(userDataPath, 'demo-paths.json');
  fs.writeFileSync(file, JSON.stringify(overrides, null, 2), 'utf8');
}

function resolveDemo(demo, overrides) {
  if (!demo) return null;
  if (demo.kind === 'url') {
    return { ...demo, resolvedPath: demo.url, exists: true };
  }
  const resolvedPath = normalizePath(overrides[demo.id] || demo.path);
  return {
    ...demo,
    resolvedPath,
    exists: fs.existsSync(resolvedPath),
  };
}

async function findProcessesByPath(exePath) {
  const script = `
    $target = [System.IO.Path]::GetFullPath('${escapePs(exePath)}')
    $procs = @(Get-CimInstance Win32_Process | Where-Object {
      $_.ExecutablePath -and ([System.IO.Path]::GetFullPath($_.ExecutablePath) -eq $target)
    } | Select-Object ProcessId, Name, ExecutablePath)
    if ($procs.Count -eq 0) { '[]' } else { $procs | ConvertTo-Json -Compress }
  `;
  const raw = await runPs(script);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function focusPids(pids) {
  const idList = [...new Set(pids.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  if (idList.length === 0) throw new Error('No process ids');
  const script = `
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VoyantWin {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
}
"@
    $want = @(${idList.join(',')})
    $found = New-Object System.Collections.Generic.List[IntPtr]
    $cb = [VoyantWin+EnumWindowsProc]{
      param($hWnd, $lParam)
      if (-not [VoyantWin]::IsWindowVisible($hWnd)) { return $true }
      $procId = [uint32]0
      [void][VoyantWin]::GetWindowThreadProcessId($hWnd, [ref]$procId)
      if ($want -contains [int]$procId) { $found.Add($hWnd) }
      return $true
    }
    [VoyantWin]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
    if ($found.Count -eq 0) { throw 'No visible window for process' }
    $h = $found[0]
    [VoyantWin]::AllowSetForegroundWindow(-1) | Out-Null
    if ([VoyantWin]::IsIconic($h)) { [VoyantWin]::ShowWindow($h, 9) | Out-Null }
    else { [VoyantWin]::ShowWindow($h, 5) | Out-Null }
    [VoyantWin]::SetForegroundWindow($h) | Out-Null
    "ok:$($found.Count)"
  `;
  await runPs(script);
}

function demoProcessEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      key === 'VITE_DEV_SERVER_URL' ||
      key === 'NODE_ENV' ||
      key.startsWith('ELECTRON_') ||
      key.startsWith('VITE_') ||
      key.startsWith('ELECTRON')
    ) {
      delete env[key];
    }
  }
  return env;
}

function spawnDemo(exePath) {
  return new Promise((resolve) => {
    const timeline = [];
    const mark = (event, extra) => {
      timeline.push({ t: Date.now(), event, ...extra });
    };
    let spawnError = null;
    const child = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      env: demoProcessEnv(),
    });
    mark('spawn-called', { pid: child.pid, cwd: path.dirname(exePath) });
    child.once('error', (err) => {
      spawnError = {
        message: err.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
      };
      mark('spawn-error', spawnError);
    });
    child.once('exit', (code, signal) => {
      mark('exit', { code, signal, pidAlive: diagnose.pidAlive(child.pid) });
    });
    child.once('close', (code, signal) => {
      mark('close', { code, signal });
    });
    child.unref();
    setTimeout(async () => {
      const processes = await diagnose.findProcesses(exePath);
      const byPath = Array.isArray(processes.byPath) ? processes.byPath : [];
      const byName = Array.isArray(processes.byName) ? processes.byName : [];
      mark('poll-2s', {
        pidAlive: diagnose.pidAlive(child.pid),
        byPathCount: byPath.length,
        byNameCount: byName.length,
      });
      resolve({
        pid: child.pid,
        spawnError,
        stillRunning: byPath.length > 0 || byName.length > 0 || diagnose.pidAlive(child.pid),
        runningByPath: byPath,
        runningByName: byName,
        runningPids: [...byPath, ...byName].map((proc) => proc.ProcessId),
        timeline,
        processes,
      });
    }, 2000);
  });
}

async function listManaged(userDataPath, options = {}) {
  snapshotUserDataPath = userDataPath;
  const overrides = loadOverrides(userDataPath);
  let snapshot = { windows: [], processes: [] };
  try {
    snapshot = await getSnapshot(options.force === true);
  } catch {
    snapshot = { windows: [], processes: [] };
  }
  return catalog.demos.map((demo) => {
    const resolved = resolveDemo(demo, overrides);
    const isExe = resolved.kind === 'exe' && resolved.exists;
    const procs = isExe ? processesForPath(snapshot, resolved.resolvedPath) : [];
    const wins = isExe ? windowsForPath(snapshot, resolved.resolvedPath) : [];
    return {
      id: demo.id,
      label: demo.label,
      category: demo.category,
      kind: demo.kind,
      path: resolved.resolvedPath,
      exists: resolved.exists,
      running: procs.map((proc) => ({ pid: proc.pid, name: path.basename(proc.path || '') })),
      // A process without a window is still starting up, which is the only case
      // where the launching overlay should stay on screen.
      hasWindow: wins.length > 0,
    };
  });
}

async function switchToDemo(userDataPath, demoId) {
  snapshotUserDataPath = userDataPath;
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo || demo.kind !== 'exe') {
    return { ok: false, reason: 'not-exe', id: demoId };
  }
  const resolved = resolveDemo(demo, loadOverrides(userDataPath));
  if (!resolved.exists) {
    return { ok: false, reason: 'missing', id: demo.id, path: resolved.resolvedPath };
  }

  const snapshot = await getSnapshot(true);
  const wins = windowsForPath(snapshot, resolved.resolvedPath);
  const procs = processesForPath(snapshot, resolved.resolvedPath);
  launchLog.appendLaunchLog(userDataPath, {
    event: 'switch-probe',
    id: demo.id,
    path: resolved.resolvedPath,
    snapshotMs: snapshot.elapsedMs,
    processCount: procs.length,
    windowCount: wins.length,
    // Totals for the whole machine: if these are 0 the worker is broken, not the demo.
    snapshotWindows: snapshot.windows.length,
    snapshotProcesses: snapshot.processes.length,
    windows: wins.map((win) => ({ hwnd: win.hwnd, pid: win.pid, title: win.title })),
  });

  if (wins.length === 0) {
    const reason = procs.length > 0 ? 'starting' : 'not-running';
    launchLog.appendLaunchLog(userDataPath, {
      event: 'switch-no-window',
      id: demo.id,
      reason,
      processCount: procs.length,
    });
    return { ok: false, reason, id: demo.id, path: resolved.resolvedPath, processCount: procs.length };
  }

  const target = wins[0];
  let raised;
  try {
    raised = await winHelper.raise(target.hwnd);
  } catch (err) {
    launchLog.appendLaunchLog(userDataPath, {
      event: 'switch-error',
      id: demo.id,
      hwnd: target.hwnd,
      error: err.message,
    });
    return { ok: false, reason: 'raise-failed', id: demo.id, error: err.message };
  }

  launchLog.appendLaunchLog(userDataPath, {
    event: 'switch-result',
    id: demo.id,
    hwnd: target.hwnd,
    pid: target.pid,
    title: target.title,
    method: raised.method,
    ok: raised.ok === true,
    foregroundBefore: raised.before,
    foregroundAfter: raised.after,
    hitTarget: String(raised.after) === String(target.hwnd),
    raiseMs: raised.elapsedMs,
  });

  if (raised.ok !== true) {
    return { ok: false, reason: 'raise-refused', id: demo.id, method: raised.method, hwnd: target.hwnd };
  }
  cachedSnapshot = null;
  return {
    ok: true,
    action: 'focused',
    id: demo.id,
    pid: target.pid,
    hwnd: target.hwnd,
    method: raised.method,
  };
}

async function launchDemo(userDataPath, demoId) {
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo) {
    launchLog.appendLaunchLog(userDataPath, { event: 'launch-unknown-demo', id: demoId });
    return { ok: false, reason: 'unknown-demo', id: demoId };
  }

  if (demo.kind === 'url') {
    launchLog.appendLaunchLog(userDataPath, { event: 'launch-url', id: demo.id, url: demo.url });
    return { ok: true, kind: 'url', url: demo.url, id: demo.id };
  }

  const overrides = loadOverrides(userDataPath);
  const resolved = resolveDemo(demo, overrides);
  launchLog.appendLaunchLog(userDataPath, {
    event: 'launch-resolve',
    id: demo.id,
    configuredPath: demo.path,
    resolvedPath: resolved.resolvedPath,
    exists: resolved.exists,
    overridden: Boolean(overrides[demo.id]),
  });
  if (!resolved.exists) {
    launchLog.appendLaunchLog(userDataPath, {
      event: 'launch-missing',
      id: demo.id,
      path: resolved.resolvedPath,
    });
    return { ok: false, reason: 'missing', id: demo.id, path: resolved.resolvedPath };
  }

  launchLog.appendLaunchLog(userDataPath, {
    event: 'launch-open',
    id: demo.id,
    path: resolved.resolvedPath,
  });

  setTimeout(() => {
    void (async () => {
      const snapshot = await getSnapshot(true).catch(() => ({ windows: [], processes: [] }));
      const errors = await diagnose.recentAppErrors(path.basename(resolved.resolvedPath));
      const wins = windowsForPath(snapshot, resolved.resolvedPath);
      const procs = processesForPath(snapshot, resolved.resolvedPath);
      launchLog.appendLaunchLog(userDataPath, {
        event: 'launch-followup-5s',
        id: demo.id,
        path: resolved.resolvedPath,
        processCount: procs.length,
        windowCount: wins.length,
        snapshotWindows: snapshot.windows.length,
        snapshotProcesses: snapshot.processes.length,
        windows: wins.map((win) => ({ hwnd: win.hwnd, pid: win.pid, title: win.title })),
        appErrors: errors,
      });
      void launchLog.uploadLaunchLogs(
        userDataPath,
        'launch-followup',
        {
          demoId: demo.id,
          path: resolved.resolvedPath,
          processCount: procs.length,
          windowCount: wins.length,
          appErrors: errors,
        },
        null,
      );
    })();
  }, 5000);

  return {
    ok: true,
    action: 'launched',
    kind: 'exe',
    id: demo.id,
    path: resolved.resolvedPath,
  };
}

async function quitDemo(userDataPath, demoId) {
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo || demo.kind !== 'exe') {
    return { ok: false, reason: 'not-exe', id: demoId };
  }
  const resolved = resolveDemo(demo, loadOverrides(userDataPath));
  const snapshot = await getSnapshot(true);
  const procs = resolved.exists ? processesForPath(snapshot, resolved.resolvedPath) : [];
  if (procs.length === 0) {
    return { ok: true, action: 'already-stopped', id: demo.id };
  }
  const pids = procs.map((proc) => proc.pid);
  await runPs(`Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue | Stop-Process`);
  cachedSnapshot = null;
  return { ok: true, action: 'stopped', id: demo.id, pids };
}

function getResolvedDemo(userDataPath, demoId) {
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo) return null;
  return resolveDemo(demo, loadOverrides(userDataPath));
}

function setDemoPath(userDataPath, demoId, nextPath) {
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo || demo.kind !== 'exe') {
    return { ok: false, reason: 'not-exe', id: demoId };
  }
  const overrides = loadOverrides(userDataPath);
  const trimmed = String(nextPath || '').trim();
  if (!trimmed || normalizePath(trimmed) === normalizePath(demo.path)) {
    delete overrides[demoId];
  } else {
    overrides[demoId] = normalizePath(trimmed);
  }
  saveOverrides(userDataPath, overrides);
  return resolveDemo(demo, overrides);
}

module.exports = {
  getCatalog,
  getResolvedDemo,
  listManaged,
  launchDemo,
  switchToDemo,
  quitDemo,
  setDemoPath,
  warmHelper: winHelper.warm,
  stopHelper: winHelper.stop,
};
