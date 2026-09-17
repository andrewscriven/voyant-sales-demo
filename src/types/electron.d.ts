export interface DemoProcess {
  pid: number;
  name: string;
}

export interface DemoStatus {
  id: string;
  label: string;
  category: string;
  kind: 'exe' | 'url';
  path: string;
  exists: boolean;
  running: DemoProcess[];
}

export interface LaunchResult {
  ok: boolean;
  id?: string;
  action?: 'focused' | 'launched' | 'stopped' | 'already-stopped';
  kind?: 'url' | 'exe';
  url?: string;
  path?: string;
  pid?: number;
  reason?: string;
  error?: string;
}

export interface ElectronAPI {
  closeApp: () => void;
  getAppVersion: () => Promise<string>;
  getCatalog: () => Promise<{
    categories: { id: string; label: string }[];
    demos: { id: string; label: string; category: string; kind: string; path?: string; url?: string }[];
  }>;
  listDemos: () => Promise<DemoStatus[]>;
  launchDemo: (demoId: string) => Promise<LaunchResult>;
  focusDemo: (demoId: string) => Promise<LaunchResult>;
  quitDemo: (demoId: string) => Promise<LaunchResult>;
  setDemoPath: (demoId: string, nextPath: string) => Promise<{ id: string; resolvedPath: string; exists: boolean }>;
  pickDemoExe: (demoId: string) => Promise<{
    ok: boolean;
    canceled?: boolean;
    id?: string;
    resolvedPath?: string;
    exists?: boolean;
    reason?: string;
  }>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
