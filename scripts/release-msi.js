const { spawn, spawnSync } = require('child_process');

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const shouldUpload = args.includes('--upload');
const bump = args.find((arg) => ['patch', 'minor', 'major'].includes(arg) || /^\d+\.\d+\.\d+$/.test(arg)) || 'patch';

function run(command, commandArgs, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n${label}`);
    const child = spawn(command, commandArgs, { stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

function computedVersion() {
  const result = spawnSync('node', ['scripts/compute-version.mjs'], { encoding: 'utf8' });
  const auto = (result.stdout || '').trim();
  return /^\d+\.\d+\.\d+$/.test(auto) ? auto : null;
}

async function main() {
  if (!isLocal) {
    let bumpArg = bump;
    if (bump === 'patch') {
      bumpArg = computedVersion() || 'patch';
    }
    await run('node', ['scripts/bump-version.js', bumpArg], 'Set release version');
  }
  await run(
    'node',
    ['scripts/build-msi.js', ...(isLocal ? ['--local'] : []), ...(shouldUpload ? ['--upload'] : [])],
    'Build MSI',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
