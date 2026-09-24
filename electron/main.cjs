const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const processManager = require('./process-manager.cjs');
const launchLog = require('./launch-log.cjs');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  process.exit(0);
}

let mainWindow = null;

function userDataPath() {
  return app.getPath('userData');
}

// Demos are Electron apps that read these to decide dev vs packaged. ShellExecute
// hands our environment to the child, so a demo would load our Vite server.
const INHERITED_DEV_KEYS = ['NODE_ENV', 'VITE_DEV_SERVER_URL'];

async function openDemoExe(exePath) {
  const saved = new Map();
  for (const key of Object.keys(process.env)) {
    if (INHERITED_DEV_KEYS.includes(key) || key.startsWith('VITE_') || key.startsWith('ELECTRON_')) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
  }
  try {
    await shell.openExternal(exePath.replace(/\\/g, '/'));
  } finally {
    for (const [key, value] of saved) {
      process.env[key] = value;
    }
  }
}

function appIcon() {
  const packed = path.join(__dirname, '../web-dist/icon.ico');
  const loose = path.join(__dirname, '../public/icon.ico');
  if (fs.existsSync(packed)) return packed;
  if (fs.existsSync(loose)) return loose;
  return undefined;
}

function createWindow() {
  const isDev = Boolean(process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development');
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#0d0c1d',
    icon: appIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: true,
    frame: true,
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3002';
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../web-dist/index.html'));
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && mainWindow && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.setFullScreen(true);
  mainWindow.focus();
});

app.whenReady().then(() => {
  ipcMain.on('close-app', () => {
    app.quit();
  });

  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-catalog', () => processManager.getCatalog());
  ipcMain.handle('list-demos', (_event, options) => processManager.listManaged(userDataPath(), options || {}));
  ipcMain.handle('switch-demo', async (_event, demoId) => {
    const started = Date.now();
    launchLog.appendLaunchLog(userDataPath(), { event: 'ipc-switch-demo', id: demoId });
    const result = await processManager.switchToDemo(userDataPath(), demoId);
    launchLog.appendLaunchLog(userDataPath(), {
      event: 'ipc-switch-done',
      id: demoId,
      ok: result.ok,
      reason: result.reason || null,
      method: result.method || null,
      totalMs: Date.now() - started,
    });
    return result;
  });
  ipcMain.handle('launch-demo', async (_event, demoId) => {
    launchLog.appendLaunchLog(userDataPath(), { event: 'ipc-launch-demo', id: demoId });
    const result = await processManager.launchDemo(userDataPath(), demoId);
    if (result.ok && result.kind === 'url' && result.url) {
      await shell.openExternal(result.url);
    }
    if (result.ok && result.kind === 'exe' && result.path) {
      const openedAt = Date.now();
      try {
        await openDemoExe(result.path);
        launchLog.appendLaunchLog(userDataPath(), {
          event: 'launch-shell-open-done',
          id: demoId,
          openMs: Date.now() - openedAt,
        });
      } catch (err) {
        const failed = {
          ok: false,
          reason: 'spawn-failed',
          id: demoId,
          path: result.path,
          error: err instanceof Error ? err.message : String(err),
        };
        launchLog.appendLaunchLog(userDataPath(), { event: 'launch-open-error', ...failed });
        void launchLog.uploadLaunchLogs(
          userDataPath(),
          'launch-failed',
          { demoId, result: failed, showedPicker: false },
          app.getVersion(),
        );
        return failed;
      }
    }
    void launchLog.uploadLaunchLogs(
      userDataPath(),
      result.ok ? 'launch-result' : 'launch-failed',
      { demoId, result, showedPicker: result.reason === 'missing' },
      app.getVersion(),
    );
    return result;
  });
  ipcMain.handle('focus-demo', (_event, demoId) => processManager.switchToDemo(userDataPath(), demoId));
  ipcMain.handle('quit-demo', (_event, demoId) => processManager.quitDemo(userDataPath(), demoId));
  ipcMain.handle('set-demo-path', (_event, demoId, nextPath) =>
    processManager.setDemoPath(userDataPath(), demoId, nextPath)
  );
  ipcMain.handle('pick-demo-exe', async (_event, demoId) => {
    const catalog = processManager.getCatalog();
    const demo = catalog.demos.find((item) => item.id === demoId);
    if (!demo || demo.kind !== 'exe') {
      return { ok: false, reason: 'not-exe', id: demoId };
    }
    const current = processManager.getResolvedDemo(userDataPath(), demoId)?.resolvedPath || demo.path || '';
    const startDir = current && fs.existsSync(path.dirname(current))
      ? path.dirname(current)
      : (current && fs.existsSync(current) ? current : undefined);
    launchLog.appendLaunchLog(userDataPath(), {
      event: 'picker-opened',
      id: demoId,
      defaultPath: current,
      startDir: startDir || null,
    });
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: `Locate ${demo.label}`,
      defaultPath: startDir,
      filters: [
        { name: 'Applications', extensions: ['exe'] },
        { name: 'All files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (picked.canceled || !picked.filePaths[0]) {
      launchLog.appendLaunchLog(userDataPath(), { event: 'picker-canceled', id: demoId });
      void launchLog.uploadLaunchLogs(
        userDataPath(),
        'picker-canceled',
        { demoId, defaultPath: current },
        app.getVersion(),
      );
      return { ok: false, canceled: true, id: demoId };
    }
    const saved = processManager.setDemoPath(userDataPath(), demoId, picked.filePaths[0]);
    launchLog.appendLaunchLog(userDataPath(), {
      event: 'picker-picked',
      id: demoId,
      path: saved.resolvedPath,
      exists: saved.exists,
    });
    void launchLog.uploadLaunchLogs(
      userDataPath(),
      'picker-picked',
      { demoId, path: saved.resolvedPath, exists: saved.exists },
      app.getVersion(),
    );
    return { ok: true, id: demoId, ...saved };
  });
  ipcMain.handle('get-diagnostic-log-files', (_event, options) => {
    const maxBytes = options && Number.isFinite(options.maxBytes) ? options.maxBytes : 60_000;
    return {
      launchDebug: launchLog.readLaunchLogTail(userDataPath(), maxBytes),
      videoDebug: null,
      svgAnimationDebug: null,
      packDownload: null,
    };
  });
  ipcMain.handle('open-external', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      return shell.openExternal(url);
    }
    return false;
  });

  launchLog.appendLaunchLog(userDataPath(), {
    event: 'app-ready',
    version: app.getVersion(),
  });
  void processManager.warmHelper();
  void launchLog.uploadLaunchLogs(
    userDataPath(),
    'session-start',
    { version: app.getVersion() },
    app.getVersion(),
  );

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  processManager.stopHelper();
});
