const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getCatalog: () => ipcRenderer.invoke('get-catalog'),
  listDemos: () => ipcRenderer.invoke('list-demos'),
  launchDemo: (demoId) => ipcRenderer.invoke('launch-demo', demoId),
  focusDemo: (demoId) => ipcRenderer.invoke('focus-demo', demoId),
  quitDemo: (demoId) => ipcRenderer.invoke('quit-demo', demoId),
  setDemoPath: (demoId, nextPath) => ipcRenderer.invoke('set-demo-path', demoId, nextPath),
  pickDemoExe: (demoId) => ipcRenderer.invoke('pick-demo-exe', demoId),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
