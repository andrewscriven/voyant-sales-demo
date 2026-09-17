const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PRODUCT_NAME = 'Voyant Sales Demo';
const MSI_FILE_NAME = 'Voyant-Sales-Demo.msi';
const APP_ID = 'com.voyantstudios.sales-demo';
const UPGRADE_CODE = '7F3A9C21-8B4E-4D16-A902-C1E5B7A84F20';
const S3_BUCKET = process.env.VOYANT_RELEASE_S3_BUCKET || 's3://voyantstudios.com';
const PUBLIC_PREFIX = 'downloads/voyant-sales-demo';
const PUBLIC_BASE_URL =
  process.env.VOYANT_RELEASE_PUBLIC_BASE_URL || 'https://www.voyantstudios.com/downloads/voyant-sales-demo';
const CLOUDFRONT_ID = process.env.VOYANT_DOWNLOADS_CLOUDFRONT_DISTRIBUTION_ID || 'E3RTTDMT0ILJ4L';

const args = process.argv.slice(2);
const shouldUpload = args.includes('--upload');
const isLocal = args.includes('--local');
const skipSign = args.includes('--skip-sign') || process.env.SKIP_SIGNING === 'true';

function run(command, commandArgs, label, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n${label}`);
    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha512File(filePath) {
  return crypto.createHash('sha512').update(fs.readFileSync(filePath)).digest('base64');
}

function renderDownloadPage({ version, msiName, msiSize }) {
  const template = fs.readFileSync(path.join(ROOT, 'build', 'download-page.html'), 'utf8');
  return template
    .replaceAll('__VERSION__', version)
    .replaceAll('__MSI_NAME__', msiName)
    .replaceAll('__MSI_SIZE__', msiSize);
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  const workDir = path.join(ROOT, 'release-msi', version);
  const outputDir = path.join(workDir, 'builder');
  fs.mkdirSync(workDir, { recursive: true });

  if (!fs.existsSync(path.join(ROOT, 'public', 'icon.ico'))) {
    await run('node', ['scripts/generate-icon.js'], 'Generate Windows icon');
  }

  await run('npm', ['run', 'build:web'], 'Build web bundle');

  const env = {
    ...process.env,
    ...(skipSign ? { SKIP_SIGNING: 'true' } : {}),
  };

  await run(
    'npx',
    [
      'electron-builder',
      '--win',
      '--x64',
      '--config.directories.output',
      outputDir.replace(/\\/g, '/'),
    ],
    'Package MSI',
    { env },
  );

  const builtMsi = fs.readdirSync(outputDir).find((name) => name.toLowerCase().endsWith('.msi'));
  if (!builtMsi) throw new Error(`No MSI found in ${outputDir}`);

  const msiPath = path.join(outputDir, builtMsi);
  const stagedMsi = path.join(workDir, MSI_FILE_NAME);
  fs.copyFileSync(msiPath, stagedMsi);

  const stats = fs.statSync(stagedMsi);
  const releasedAt = new Date().toISOString();
  const releaseUrl = `${PUBLIC_BASE_URL}/releases/${version}/${MSI_FILE_NAME}`;
  const currentPointer = {
    product: PRODUCT_NAME,
    channel: 'stable',
    version,
    releasedAt,
    appId: APP_ID,
    upgradeCode: UPGRADE_CODE,
    msi_url: releaseUrl,
    download_url: releaseUrl,
    file_name: MSI_FILE_NAME,
    msi: {
      name: MSI_FILE_NAME,
      url: releaseUrl,
      size: stats.size,
      sha256: sha256File(stagedMsi),
      sha512: sha512File(stagedMsi),
    },
  };

  fs.writeFileSync(path.join(workDir, 'current-release.json'), `${JSON.stringify(currentPointer, null, 2)}\n`);
  fs.writeFileSync(
    path.join(workDir, 'index.html'),
    renderDownloadPage({
      version,
      msiName: MSI_FILE_NAME,
      msiSize: formatBytes(stats.size),
    }),
  );

  console.log(`\nLocal MSI: ${stagedMsi}`);
  console.log(`Version ${version} · ${formatBytes(stats.size)}`);

  if (!shouldUpload || isLocal) {
    console.log('Skipping S3 upload. Pass --upload to publish.');
    return;
  }

  const versionPrefix = `${S3_BUCKET}/${PUBLIC_PREFIX}/releases/${version}/`;
  const latestPrefix = `${S3_BUCKET}/${PUBLIC_PREFIX}/`;
  await run(
    'aws',
    ['s3', 'cp', `"${stagedMsi}"`, `"${versionPrefix}${MSI_FILE_NAME}"`, '--no-cli-pager'],
    'Upload MSI',
  );
  await run(
    'aws',
    [
      's3',
      'cp',
      `"${path.join(workDir, 'current-release.json')}"`,
      `"${latestPrefix}current-release.json"`,
      '--content-type',
      'application/json',
      '--cache-control',
      '"no-cache, max-age=0"',
      '--no-cli-pager',
    ],
    'Upload release manifest',
  );
  await run(
    'aws',
    [
      's3',
      'cp',
      `"${path.join(workDir, 'index.html')}"`,
      `"${S3_BUCKET}/downloads/voyant-sales-demo.html"`,
      '--content-type',
      'text/html; charset=utf-8',
      '--cache-control',
      '"no-cache, max-age=0"',
      '--no-cli-pager',
    ],
    'Upload download page',
  );

  try {
    execSync(
      `aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/downloads/voyant-sales-demo.html" "/${PUBLIC_PREFIX}/current-release.json" --no-cli-pager`,
      { stdio: 'inherit', cwd: ROOT },
    );
  } catch {
    console.warn('CloudFront invalidation failed. The new page may take a few minutes to appear.');
  }

  console.log(`\nPublished ${PUBLIC_BASE_URL.replace(/\/voyant-sales-demo$/, '')}/voyant-sales-demo.html`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
