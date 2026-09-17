import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSeriesFooter } from '../config/toc';

interface PageChromeProps {
  banner?: string | null;
  eyebrow?: string;
  children: ReactNode;
  light?: boolean;
}

export function PageChrome({ banner = null, eyebrow, children, light }: PageChromeProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const series = getSeriesFooter(pathname);

  return (
    <div className={`page-chrome ${light ? 'is-light' : ''}`}>
      {banner ? <div className="page-banner">{banner}</div> : null}
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <div className="page-chrome-body">{children}</div>
      <div className="page-chrome-foot">
        {series.length ? (
          <div className="page-series-links text-links">
            {series.map((link) => (
              <button key={link.path} type="button" onClick={() => navigate(link.path)}>
                {link.label}
              </button>
            ))}
          </div>
        ) : null}
        <p className="page-copy">© 2026 Voyant Studios™</p>
      </div>
    </div>
  );
}
