import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import '../pages/pages.css';

export function StageBackground() {
  const { pathname } = useLocation();
  const home = pathname === '/';
  const bgRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef(true);

  useLayoutEffect(() => {
    const el = bgRef.current;
    if (!el) return;

    if (firstRef.current) {
      firstRef.current = false;
      gsap.set(el, { opacity: home ? 1 : 0, scale: 1 });
      return;
    }

    if (home) {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 1.045 },
        { opacity: 1, scale: 1, duration: 0.55, ease: 'power2.out', force3D: true },
      );
    } else {
      gsap.to(el, { opacity: 0, duration: 0.3, ease: 'power1.out', force3D: true });
    }
  }, [home]);

  return (
    <>
      <div className="app-inner-bloom" aria-hidden="true" />
      <div className="app-home-bg" ref={bgRef} aria-hidden="true">
        <div className="hero-fx">
          <div className="hero-glow-indigo" />
          <div className="hero-glow-cyan" />
          <div className="hero-glow-1" />
          <div className="hero-glow-2" />
          <div className="hero-beam" />
          <div className="hero-pool" />
        </div>
      </div>
    </>
  );
}
