export const ANALYTICS_DEMO = 'https://analytics.voyantstudios.com/';

/** Bundled media from `public/` — works in Vite and packaged Electron. */
export function localMedia(path: string): string {
  const clean = path.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}

export const LOGO_SRC = localMedia('/images/voyant-logo-light.png');

export function openWebLink(url: string) {
  if (window.electronAPI?.openExternal) {
    void window.electronAPI.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}
