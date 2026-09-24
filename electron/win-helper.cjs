// Long-lived PowerShell worker. Spawning powershell.exe per query costs ~500ms and
// compiling the user32 interop costs ~250ms more, so both happen once at startup and
// every later command is a stdin round trip.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SENTINEL = '__VOYANT_END__';
const COMMAND_TIMEOUT_MS = 5000;

const SCRIPT_LINES = [
  '$ErrorActionPreference = "Stop"',
  '$OutputEncoding = [System.Text.Encoding]::UTF8',
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  'Add-Type -TypeDefinition @"',
  'using System;',
  'using System.Text;',
  'using System.Collections.Generic;',
  'using System.Runtime.InteropServices;',
  'public static class VoyantWin {',
  '  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);',
  '  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);',
  '  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);',
  '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);',
  '  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);',
  '  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);',
  '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);',
  '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
  '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
  '  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);',
  '  [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int pid);',
  '  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);',
  '  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);',
  '  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr h, bool altTab);',
  '  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint flags);',
  '  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();',
  '  [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);',
  '  public static List<string> Enumerate() {',
  '    var list = new List<string>();',
  '    EnumWindows((h, p) => {',
  '      if (!IsWindowVisible(h)) return true;',
  '      uint pid = 0; GetWindowThreadProcessId(h, out pid);',
  '      int len = GetWindowTextLength(h);',
  '      var sb = new StringBuilder(len + 2);',
  '      GetWindowText(h, sb, sb.Capacity);',
  '      string root = (GetAncestor(h, 3) == h) ? "1" : "0";',
  '      list.Add(h.ToInt64() + "|" + pid + "|" + root + "|" + sb.ToString().Replace("|", " "));',
  '      return true;',
  '    }, IntPtr.Zero);',
  '    return list;',
  '  }',
  // Windows only lets the process that owns the foreground (or one it granted
  // rights to) change it. This worker owns nothing, so escalate through the
  // documented workarounds and report which step actually won.
  '  private static bool Landed(IntPtr h, int tries) {',
  '    for (int i = 0; i < tries; i++) {',
  '      if (GetForegroundWindow() == h) return true;',
  '      System.Threading.Thread.Sleep(10);',
  '    }',
  '    return false;',
  '  }',
  '  public static string Raise(IntPtr h) {',
  '    AllowSetForegroundWindow(-1);',
  '    if (IsIconic(h)) { ShowWindow(h, 9); } else { ShowWindow(h, 5); }',
  '    BringWindowToTop(h);',
  '    SetForegroundWindow(h);',
  '    if (Landed(h, 3)) return "setforeground";',
  '    uint self = GetCurrentThreadId();',
  '    uint ignored = 0;',
  // Borrow the input queue of whoever currently holds the foreground; that is
  // what confers the right to hand it to someone else.
  '    uint holder = GetWindowThreadProcessId(GetForegroundWindow(), out ignored);',
  '    if (holder != 0 && AttachThreadInput(self, holder, true)) {',
  '      BringWindowToTop(h);',
  '      SetForegroundWindow(h);',
      '      AttachThreadInput(self, holder, false);',
  '      if (Landed(h, 8)) return "attach-foreground";',
  '    }',
  '    uint targetThread = GetWindowThreadProcessId(h, out ignored);',
  '    if (targetThread != 0 && AttachThreadInput(self, targetThread, true)) {',
  '      SetForegroundWindow(h);',
  '      AttachThreadInput(self, targetThread, false);',
  '      if (Landed(h, 8)) return "attach-target";',
  '    }',
  // A synthetic ALT tap makes this process the last one to supply input, which
  // clears the foreground lock for the call that follows.
  '    keybd_event(0x12, 0, 0, UIntPtr.Zero);',
  '    keybd_event(0x12, 0, 2, UIntPtr.Zero);',
  '    SetForegroundWindow(h);',
  '    if (Landed(h, 8)) return "altkey";',
  '    SwitchToThisWindow(h, true);',
  '    if (Landed(h, 10)) return "switchtothiswindow";',
  '    return "failed";',
  '  }',
  '  public static long Foreground() { return GetForegroundWindow().ToInt64(); }',
  '}',
  '"@',
  'function Get-PathMap {',
  '  $map = @{}',
  '  foreach ($p in Get-Process) {',
  '    try { if ($p.Path) { $map[[int]$p.Id] = $p.Path } } catch { }',
  '  }',
  '  return $map',
  '}',
  'while ($true) {',
  '  $line = [Console]::In.ReadLine()',
  '  if ($null -eq $line) { break }',
  '  $line = $line.Trim()',
  '  if ($line.Length -eq 0) { continue }',
  '  $verb = $line.Split(" ")[0]',
  '  try {',
  '    if ($verb -eq "snapshot") {',
  '      $map = Get-PathMap',
  '      $windows = @()',
  '      foreach ($raw in [VoyantWin]::Enumerate()) {',
  '        $f = $raw.Split("|")',
  '        $wpid = [int]$f[1]',
  '        $windows += [pscustomobject]@{ hwnd = [long]$f[0]; pid = $wpid; title = $f[2]; path = $map[$wpid] }',
  '      }',
  '      $procs = @()',
  '      foreach ($key in $map.Keys) { $procs += [pscustomobject]@{ pid = $key; path = $map[$key] } }',
  '      $payload = [pscustomobject]@{ ok = $true; windows = $windows; processes = $procs }',
  '      Write-Output ($payload | ConvertTo-Json -Compress -Depth 4)',
  '    }',
  '    elseif ($verb -eq "raise") {',
  '      $h = [IntPtr][long]$line.Split(" ")[1]',
  '      $before = [VoyantWin]::Foreground()',
  '      $method = [VoyantWin]::Raise($h)',
  '      $after = [VoyantWin]::Foreground()',
  '      $payload = [pscustomobject]@{ ok = ($method -ne "failed"); method = $method; before = $before; after = $after }',
  '      Write-Output ($payload | ConvertTo-Json -Compress)',
  '    }',
  '    elseif ($verb -eq "ping") { Write-Output "{""ok"":true}" }',
  '    else { Write-Output "{""ok"":false,""error"":""unknown-command""}" }',
  '  } catch {',
  '    $msg = $_.Exception.Message.Replace([char]34, [char]39).Replace([char]92, [char]47)',
  '    Write-Output (\'{"ok":false,"error":"\' + $msg + \'"}\')',
  '  }',
  `  Write-Output "${SENTINEL}"`,
  '}',
];

let child = null;
let scriptPath = null;
let buffer = '';
let queue = [];
let starting = null;

function writeScript() {
  if (scriptPath && fs.existsSync(scriptPath)) return scriptPath;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voyant-winhelper-'));
  scriptPath = path.join(dir, 'win-helper.ps1');
  fs.writeFileSync(scriptPath, SCRIPT_LINES.join('\r\n'), 'utf8');
  return scriptPath;
}

function rejectAll(err) {
  const pending = queue;
  queue = [];
  for (const item of pending) {
    clearTimeout(item.timer);
    item.reject(err);
  }
}

function handleChunk(text) {
  buffer += text;
  let index = buffer.indexOf(SENTINEL);
  while (index !== -1) {
    const body = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + SENTINEL.length);
    const item = queue.shift();
    if (item) {
      clearTimeout(item.timer);
      try {
        item.resolve(body ? JSON.parse(body) : { ok: false, error: 'empty-response' });
      } catch (err) {
        item.resolve({ ok: false, error: `bad-json: ${err.message}`, raw: body.slice(0, 400) });
      }
    }
    index = buffer.indexOf(SENTINEL);
  }
}

function start() {
  if (child && !child.killed) return Promise.resolve();
  if (starting) return starting;
  starting = new Promise((resolve, reject) => {
    let settled = false;
    try {
      child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', writeScript()],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (err) {
      starting = null;
      reject(err);
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (text) => {
      if (!settled) {
        settled = true;
        resolve();
      }
      handleChunk(text);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', () => {});
    child.once('error', (err) => {
      child = null;
      starting = null;
      rejectAll(err);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    child.once('exit', () => {
      child = null;
      starting = null;
      buffer = '';
      rejectAll(new Error('win-helper exited'));
    });
    // The interop compile happens before the first prompt, so warm it up and let
    // the ping response mark the worker ready.
    child.stdin.write('ping\n');
    queue.push({
      resolve: () => {},
      reject: () => {},
      timer: setTimeout(() => {}, 0),
    });
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve();
      }
    }, 4000);
  });
  return starting;
}

function send(command) {
  return start().then(
    () =>
      new Promise((resolve, reject) => {
        if (!child || child.killed) {
          reject(new Error('win-helper not running'));
          return;
        }
        const timer = setTimeout(() => {
          const index = queue.findIndex((item) => item.timer === timer);
          if (index !== -1) queue.splice(index, 1);
          reject(new Error(`win-helper timeout: ${command}`));
        }, COMMAND_TIMEOUT_MS);
        queue.push({ resolve, reject, timer });
        child.stdin.write(`${command}\n`);
      })
  );
}

async function snapshot() {
  const started = Date.now();
  const result = await send('snapshot');
  const windows = Array.isArray(result.windows) ? result.windows : result.windows ? [result.windows] : [];
  const processes = Array.isArray(result.processes) ? result.processes : result.processes ? [result.processes] : [];
  return { ok: result.ok !== false, windows, processes, elapsedMs: Date.now() - started };
}

async function raise(hwnd) {
  const started = Date.now();
  const result = await send(`raise ${hwnd}`);
  return { ...result, elapsedMs: Date.now() - started };
}

function warm() {
  return start().catch(() => {});
}

function stop() {
  if (child && !child.killed) {
    try {
      child.stdin.end();
    } catch {}
    child.kill();
  }
  child = null;
}

module.exports = { snapshot, raise, warm, stop };
