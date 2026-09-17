const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const processManager = require('./process-manager.cjs');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  process.exit(0);
}

let mainWindow = null;

function userDataPath() {
  return app.getPath('userData');
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
  ipcMain.handle('list-demos', () => processManager.listManaged(userDataPath()));
  ipcMain.handle('launch-demo', async (_event, demoId) => {
    const result = await processManager.launchDemo(userDataPath(), demoId);
    if (result.ok && result.kind === 'url' && result.url) {
      await shell.openExternal(result.url);
    }
    return result;
  });
  ipcMain.handle('focus-demo', (_event, demoId) => processManager.focusDemo(userDataPath(), demoId));
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
      return { ok: false, canceled: true, id: demoId };
    }
    const saved = processManager.setDemoPath(userDataPath(), demoId, picked.filePaths[0]);
    return { ok: true, id: demoId, ...saved };
  });
  ipcMain.handle('open-external', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      return shell.openExternal(url);
    }
    return false;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
