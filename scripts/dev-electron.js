const { spawn } = require('child_process');

const VITE_URL = 'http://localhost:3002';

console.log('Starting Voyant Sales Demo (Electron)...\n');

let vite = null;

(async () => {
  vite = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env },
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const electron = spawn('electron', ['.'], {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: VITE_URL,
    },
  });

  electron.on('close', (code) => {
    if (vite) vite.kill();
    process.exit(code ?? 0);
  });

  const shutdown = () => {
    if (vite) vite.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(err);
  if (vite) vite.kill();
  process.exit(1);
});
