import { useEffect, useRef, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Menu } from './components/Menu';
import { Hamburger } from './components/Hamburger';
import { Home } from './pages/Home';
import { Platform } from './pages/Platform';
import { Storytelling } from './pages/Storytelling';
import { Experiences } from './pages/Experiences';
import { Examples } from './pages/Examples';
import { UserManagement } from './pages/UserManagement';
import { Analytics } from './pages/Analytics';
import { AnalyticsDemo } from './pages/AnalyticsDemo';
import { Offerings } from './pages/Offerings';
import { Tradeshows } from './pages/Tradeshows';
import { PageTransition } from './components/PageTransition';
import { StageBackground } from './components/StageBackground';
import { LOGO_SRC } from './config/site';
import './App.css';

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [version, setVersion] = useState('1.0.0');
  const contentRef = useRef<HTMLDivElement>(null);
  const showBack = location.pathname !== '/';

  useEffect(() => {
    void window.electronAPI?.getAppVersion().then(setVersion);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    if (isMenuOpen) {
      gsap.to(contentRef.current, {
        scale: 0.7,
        x: '17rem',
        duration: 0.5,
        ease: 'power2.out',
      });
    } else {
      gsap.to(contentRef.current, {
        scale: 1,
        x: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  }, [isMenuOpen]);

  const isElectron = Boolean(window.electronAPI);

  return (
    <div className={`app ${isElectron ? 'app--electron' : 'app--browser'} ${location.pathname === '/' ? 'app--home' : ''}`}>
      <div className="app-content">
        <StageBackground />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} version={version} />
        <div className="nav-controls">
          <Hamburger open={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)} />
          {showBack && (
            <button type="button" className="back-button" aria-label="Back" onClick={() => navigate(-1)} />
          )}
        </div>
        <img className="page-logo" src={LOGO_SRC} alt="Voyant" />
        {isMenuOpen && <div className="menu-backdrop" onClick={() => setIsMenuOpen(false)} />}
        <div className={`page-content-wrapper ${isMenuOpen ? 'menu-open' : ''}`} ref={contentRef}>
          <PageTransition
            render={(loc) => (
              <Routes location={loc}>
                <Route path="/" element={<Home />} />
                <Route path="/platform" element={<Platform />} />
                <Route path="/storytelling" element={<Storytelling />} />
                <Route path="/experiences" element={<Experiences />} />
                <Route path="/examples/:tab?" element={<Examples />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/analytics-demo" element={<AnalyticsDemo />} />
                <Route path="/offerings" element={<Offerings />} />
                <Route path="/tradeshows/:brand?" element={<Tradeshows />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
