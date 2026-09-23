const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const catalog = require('../shared/demos.json');
const launchLog = require('./launch-log.cjs');
const diagnose = require('./diagnose-exe.cjs');

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

async function focusPid(pid) {
  const script = `
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VoyantWin {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
}
"@
    $p = Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue
    if (-not $p) { throw 'Process is not running' }
    $h = $p.MainWindowHandle
    if ($h -eq [IntPtr]::Zero) { throw 'Process has no main window' }
    [VoyantWin]::AllowSetForegroundWindow(-1) | Out-Null
    if ([VoyantWin]::IsIconic($h)) { [VoyantWin]::ShowWindow($h, 9) | Out-Null }
    else { [VoyantWin]::ShowWindow($h, 5) | Out-Null }
    [VoyantWin]::SetForegroundWindow($h) | Out-Null
    'ok'
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

async function listManaged(userDataPath) {
  const overrides = loadOverrides(userDataPath);
  const items = [];
  for (const demo of catalog.demos) {
    const resolved = resolveDemo(demo, overrides);
    let running = [];
    if (resolved.kind === 'exe' && resolved.exists) {
      try {
        running = await findProcessesByPath(resolved.resolvedPath);
      } catch {
        running = [];
      }
    }
    items.push({
      id: demo.id,
      label: demo.label,
      category: demo.category,
      kind: demo.kind,
      path: resolved.resolvedPath,
      exists: resolved.exists,
      running: running.map((proc) => ({
        pid: proc.ProcessId,
        name: proc.Name,
      })),
    });
  }
  return items;
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
  const fileProbe = diagnose.probeFile(resolved.resolvedPath);
  const winProbe = await diagnose.probeWindows(resolved.resolvedPath);
  launchLog.appendLaunchLog(userDataPath, {
    event: 'launch-resolve',
    id: demo.id,
    configuredPath: demo.path,
    resolvedPath: resolved.resolvedPath,
    exists: resolved.exists,
    overridden: Boolean(overrides[demo.id]),
    fileProbe,
    winProbe,
  });
  if (!resolved.exists) {
    launchLog.appendLaunchLog(userDataPath, {
      event: 'launch-missing',
      id: demo.id,
      path: resolved.resolvedPath,
    });
    return { ok: false, reason: 'missing', id: demo.id, path: resolved.resolvedPath };
  }

  const running = await findProcessesByPath(resolved.resolvedPath);
  if (running.length > 0) {
    const pid = running[0].ProcessId;
    try {
      await focusPid(pid);
      launchLog.appendLaunchLog(userDataPath, {
        event: 'launch-focused',
        id: demo.id,
        pid,
        path: resolved.resolvedPath,
      });
      return { ok: true, action: 'focused', id: demo.id, pid, path: resolved.resolvedPath };
    } catch (err) {
      launchLog.appendLaunchLog(userDataPath, {
        event: 'launch-focus-failed',
        id: demo.id,
        pid,
        error: err.message,
      });
      return { ok: false, reason: 'focus-failed', id: demo.id, pid, error: err.message };
    }
  }

  launchLog.appendLaunchLog(userDataPath, {
    event: 'launch-spawn',
    id: demo.id,
    path: resolved.resolvedPath,
  });
  const spawned = await spawnDemo(resolved.resolvedPath);
  launchLog.appendLaunchLog(userDataPath, {
    event: spawned.stillRunning ? 'launch-running' : 'launch-exited',
    id: demo.id,
    path: resolved.resolvedPath,
    ...spawned,
  });
  setTimeout(() => {
    void (async () => {
      const later = await diagnose.findProcesses(resolved.resolvedPath);
      const errors = await diagnose.recentAppErrors(path.basename(resolved.resolvedPath));
      launchLog.appendLaunchLog(userDataPath, {
        event: 'launch-followup-5s',
        id: demo.id,
        path: resolved.resolvedPath,
        pid: spawned.pid,
        pidAlive: diagnose.pidAlive(spawned.pid),
        processes: later,
        appErrors: errors,
      });
      void launchLog.uploadLaunchLogs(
        userDataPath,
        'launch-followup',
        { demoId: demo.id, path: resolved.resolvedPath, pid: spawned.pid, processes: later, appErrors: errors },
        null,
      );
    })();
  }, 5000);
  if (spawned.spawnError) {
    return {
      ok: false,
      reason: 'spawn-failed',
      id: demo.id,
      pid: spawned.pid,
      path: resolved.resolvedPath,
      error: spawned.spawnError.message || spawned.spawnError,
      stillRunning: false,
    };
  }
  return {
    ok: spawned.stillRunning,
    action: 'launched',
    id: demo.id,
    pid: spawned.pid,
    path: resolved.resolvedPath,
    stillRunning: spawned.stillRunning,
    reason: spawned.stillRunning ? undefined : 'exited',
  };
}

async function focusDemo(userDataPath, demoId) {
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo || demo.kind !== 'exe') {
    return { ok: false, reason: 'not-exe', id: demoId };
  }
  const resolved = resolveDemo(demo, loadOverrides(userDataPath));
  const running = resolved.exists ? await findProcessesByPath(resolved.resolvedPath) : [];
  if (running.length === 0) {
    return { ok: false, reason: 'not-running', id: demo.id };
  }
  const pid = running[0].ProcessId;
  await focusPid(pid);
  return { ok: true, action: 'focused', id: demo.id, pid };
}

async function quitDemo(userDataPath, demoId) {
  const demo = catalog.demos.find((item) => item.id === demoId);
  if (!demo || demo.kind !== 'exe') {
    return { ok: false, reason: 'not-exe', id: demoId };
  }
  const resolved = resolveDemo(demo, loadOverrides(userDataPath));
  const running = resolved.exists ? await findProcessesByPath(resolved.resolvedPath) : [];
  if (running.length === 0) {
    return { ok: true, action: 'already-stopped', id: demo.id };
  }
  const pids = running.map((proc) => proc.ProcessId).join(',');
  await runPs(`Get-Process -Id ${pids} -ErrorAction SilentlyContinue | Stop-Process`);
  return { ok: true, action: 'stopped', id: demo.id, pids: running.map((proc) => proc.ProcessId) };
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
  focusDemo,
  quitDemo,
  setDemoPath,
};
