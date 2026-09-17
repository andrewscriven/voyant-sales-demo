import { useNavigate } from 'react-router-dom';
import { openWebLink } from '../config/site';
import { TOC_ITEMS, type TocItem } from '../config/toc';
import { useDemos } from '../hooks/useDemos';
import './Menu.css';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

export function Menu({ isOpen, onClose, version }: MenuProps) {
  const navigate = useNavigate();
  const { demos, focus, quit } = useDemos();
  const running = demos.filter((demo) => demo.running.length > 0);

  const handleNav = (path?: string) => {
    if (!path) return;
    navigate(path);
    onClose();
  };

  const handleExit = () => {
    if (window.electronAPI) {
      window.electronAPI.closeApp();
      return;
    }
    window.close();
  };

  const renderItem = (item: TocItem, depth: number) => {
    const childClass = depth === 1 ? 'menu-nav-item--child' : '';
    return (
      <div key={item.label} className="menu-nav-group">
        <div
          className={`menu-nav-item ${childClass} ${item.action === 'exit' ? 'menu-nav-item-exit' : ''}`}
          role={item.action === 'exit' ? 'button' : 'link'}
          tabIndex={isOpen ? 0 : -1}
          onClick={() => {
            if (item.action === 'exit') {
              handleExit();
              return;
            }
            if (item.href) {
              openWebLink(item.href);
              onClose();
              return;
            }
            handleNav(item.path);
          }}
        >
          <span className="menu-nav-label">{item.label}</span>
        </div>
        {item.children?.map((child) => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className={`side-menu ${isOpen ? 'open' : ''}`}>
      <nav className="menu-nav">
        {TOC_ITEMS.filter((item) => item.action !== 'exit').map((item) => renderItem(item, 0))}
      </nav>

      {running.length > 0 && (
        <div className="menu-running">
          <div className="menu-running-title">Running demos</div>
          {running.map((demo) => (
            <div key={demo.id} className="menu-running-row">
              <button type="button" onClick={() => void focus(demo.id)}>
                {demo.label}
              </button>
              <button type="button" className="menu-running-quit" onClick={() => void quit(demo.id)}>
                Close
              </button>
            </div>
          ))}
        </div>
      )}

      {TOC_ITEMS.filter((item) => item.action === 'exit').map((item) => renderItem(item, 0))}

      <span className="side-menu-version">v{version}</span>
    </div>
  );
}
