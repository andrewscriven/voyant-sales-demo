/**
 * SafeNet USB token signing hook for electron-builder.
 * Same pattern as SWI Explorer and RESA Critical Power Solutions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SIGN_DESCRIPTION = 'Voyant Sales Demo';
// Same cert as ImmersiveSellingSetup-v2.aip (User\MY). /a can pick a stale cert and never prompt SafeNet.
const CERT_THUMBPRINT = 'A46E6A256FF974DD3AFF02725C5BC10D4EB15CFC';

exports.default = async function signWithSafeNet(configuration) {
  if (process.env.SKIP_SIGNING === 'true') {
    console.log('Skipping code signing (SKIP_SIGNING=true)');
    return;
  }

  console.log(`Signing ${path.basename(configuration.path)}`);

  let signtool = null;
  try {
    const found = execSync('where signtool.exe', { encoding: 'utf8', stdio: 'pipe' })
      .trim()
      .split(/\r?\n/);
    signtool = found.find((candidate) => fs.existsSync(candidate.trim()))?.trim() || null;
  } catch {
    // Fall through to Windows SDK paths.
  }

  if (!signtool) {
    const kitsBase = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
    const candidates = [
      'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe',
      'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe',
      'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64\\signtool.exe',
    ];
    if (fs.existsSync(kitsBase)) {
      for (const version of fs.readdirSync(kitsBase)) {
        candidates.push(path.join(kitsBase, version, 'x64', 'signtool.exe'));
      }
    }
    signtool = candidates.find((candidate) => fs.existsSync(candidate)) || null;
  }

  if (!signtool) {
    throw new Error('signtool.exe not found. Install the Windows SDK or set SKIP_SIGNING=true for a local unsigned build.');
  }

  const signCommand = `"${signtool}" sign /sha1 ${CERT_THUMBPRINT} /fd SHA256 /d "${SIGN_DESCRIPTION}" /tr http://timestamp.digicert.com /td SHA256 "${configuration.path}"`;
  console.log(`Waiting for SafeNet token prompt (${CERT_THUMBPRINT})...`);
  execSync(signCommand, { stdio: 'inherit', windowsHide: false });
  console.log('Signed successfully');
};
