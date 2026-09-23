const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function runPs(script) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: (stderr || err.message || '').toString().trim() });
          return;
        }
        resolve({ ok: true, stdout: String(stdout || '').trim() });
      },
    );
  });
}

function escapePs(value) {
  return String(value).replace(/'/g, "''");
}

function readPeInfo(exePath) {
  try {
    const fd = fs.openSync(exePath, 'r');
    const header = Buffer.alloc(64);
    fs.readSync(fd, header, 0, 64, 0);
    const mz = header.toString('ascii', 0, 2);
    if (mz !== 'MZ') {
      fs.closeSync(fd);
      return { mz, pe: false };
    }
    const eLfanew = header.readUInt32LE(0x3c);
    const pe = Buffer.alloc(6);
    fs.readSync(fd, pe, 0, 6, eLfanew);
    fs.closeSync(fd);
    const sig = pe.toString('ascii', 0, 4);
    const machine = pe.readUInt16LE(4);
    const arch = machine === 0x8664 ? 'x64' : machine === 0x14c ? 'x86' : `0x${machine.toString(16)}`;
    return { mz, pe: sig === 'PE\0\0', machine, arch };
  } catch (error) {
    return { error: error.message };
  }
}

function readZoneIdentifier(exePath) {
  try {
    return fs.readFileSync(`${exePath}:Zone.Identifier`, 'utf8').slice(0, 400);
  } catch (error) {
    return error.code === 'ENOENT' ? null : error.message;
  }
}

function probeFile(exePath) {
  const probe = {
    path: exePath,
    dirname: path.dirname(exePath),
    basename: path.basename(exePath),
    exists: false,
  };
  try {
    probe.exists = fs.existsSync(exePath);
    if (!probe.exists) {
      probe.dirExists = fs.existsSync(probe.dirname);
      if (probe.dirExists) {
        probe.dirEntries = fs
          .readdirSync(probe.dirname)
          .filter((name) => /\.(exe|lnk|bat|cmd)$/i.test(name))
          .slice(0, 40);
      }
      return probe;
    }
    const stat = fs.statSync(exePath);
    probe.isFile = stat.isFile();
    probe.isDirectory = stat.isDirectory();
    probe.isSymbolicLink = fs.lstatSync(exePath).isSymbolicLink();
    probe.size = stat.size;
    probe.mtime = stat.mtime.toISOString();
    probe.mode = stat.mode;
    try {
      probe.realpath = fs.realpathSync(exePath);
    } catch (error) {
      probe.realpathError = error.message;
    }
    try {
      const fd = fs.openSync(exePath, 'r');
      fs.closeSync(fd);
      probe.readable = true;
    } catch (error) {
      probe.readable = false;
      probe.readError = error.message;
    }
    probe.pe = readPeInfo(exePath);
    probe.zoneIdentifier = readZoneIdentifier(exePath);
    probe.dirEntries = fs
      .readdirSync(probe.dirname)
      .filter((name) => /\.(exe|lnk|bat|cmd|dll)$/i.test(name))
      .slice(0, 60);
  } catch (error) {
    probe.error = error.message;
  }
  return probe;
}

async function probeWindows(exePath) {
  const script = `
    $p = '${escapePs(exePath)}'
    $out = [ordered]@{}
    try {
      $item = Get-Item -LiteralPath $p -Force -ErrorAction Stop
      $out.fullName = $item.FullName
      $out.attributes = [string]$item.Attributes
      $out.length = $item.Length
    } catch { $out.itemError = $_.Exception.Message }
    try {
      $sig = Get-AuthenticodeSignature -LiteralPath $p
      $out.signatureStatus = [string]$sig.Status
      $out.signatureStatusMessage = [string]$sig.StatusMessage
      $out.signer = $sig.SignerCertificate.Subject
    } catch { $out.signatureError = $_.Exception.Message }
    try {
      $acl = Get-Acl -LiteralPath $p
      $out.owner = $acl.Owner
    } catch { $out.aclError = $_.Exception.Message }
    $out | ConvertTo-Json -Compress
  `;
  const result = await runPs(script);
  if (!result.ok) return { error: result.error };
  try {
    return JSON.parse(result.stdout || '{}');
  } catch {
    return { raw: result.stdout };
  }
}

async function findProcesses(exePath) {
  const name = path.basename(exePath);
  const dir = path.dirname(exePath);
  const script = `
    $target = '${escapePs(exePath)}'
    $name = '${escapePs(name)}'
    $dir = '${escapePs(dir)}'
    $all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine)
    $byPath = @($all | Where-Object { $_.ExecutablePath -and ([System.IO.Path]::GetFullPath($_.ExecutablePath) -eq [System.IO.Path]::GetFullPath($target)) })
    $byName = @($all | Where-Object { $_.Name -ieq $name })
    $byDir = @($all | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($dir, [System.StringComparison]::OrdinalIgnoreCase) })
    [pscustomobject]@{
      byPath = @($byPath | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath)
      byName = @($byName | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath)
      byDir = @($byDir | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath)
    } | ConvertTo-Json -Compress -Depth 4
  `;
  const result = await runPs(script);
  if (!result.ok) return { error: result.error };
  try {
    return JSON.parse(result.stdout || '{}');
  } catch {
    return { raw: result.stdout };
  }
}

async function recentAppErrors(exeName) {
  const script = `
    $name = '${escapePs(exeName)}'
    $since = (Get-Date).AddMinutes(-10)
    $events = @(Get-WinEvent -FilterHashtable @{ LogName='Application'; StartTime=$since; Level=2,3 } -ErrorAction SilentlyContinue |
      Where-Object { $_.Message -and $_.Message -like "*$name*" } |
      Select-Object -First 8 TimeCreated, Id, ProviderName, LevelDisplayName, Message)
    if ($events.Count -eq 0) { '[]' } else { $events | ConvertTo-Json -Compress }
  `;
  const result = await runPs(script);
  if (!result.ok) return { error: result.error };
  try {
    const parsed = JSON.parse(result.stdout || '[]');
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return { raw: result.stdout };
  }
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  probeFile,
  probeWindows,
  findProcesses,
  recentAppErrors,
  pidAlive,
};
