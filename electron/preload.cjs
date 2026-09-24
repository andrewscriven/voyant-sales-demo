const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getCatalog: () => ipcRenderer.invoke('get-catalog'),
  listDemos: (options) => ipcRenderer.invoke('list-demos', options),
  launchDemo: (demoId) => ipcRenderer.invoke('launch-demo', demoId),
  switchDemo: (demoId) => ipcRenderer.invoke('switch-demo', demoId),
  focusDemo: (demoId) => ipcRenderer.invoke('focus-demo', demoId),
  quitDemo: (demoId) => ipcRenderer.invoke('quit-demo', demoId),
  setDemoPath: (demoId, nextPath) => ipcRenderer.invoke('set-demo-path', demoId, nextPath),
  pickDemoExe: (demoId) => ipcRenderer.invoke('pick-demo-exe', demoId),
  getDiagnosticLogFiles: (options) => ipcRenderer.invoke('get-diagnostic-log-files', options),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
