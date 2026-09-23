import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, type Location } from 'react-router-dom';
import gsap from 'gsap';
import './PageTransition.css';

const GROUP_SELECTOR = [
  '[data-transition-group]',
  '.page-head',
  '.platform-head',
  '.page-main',
  '.platform-features',
  '.home-copy',
  '.home-stage',
  '.home-footer',
  '.page-chrome-foot',
  '.page-copy',
].join(', ');

function collectGroups(root: HTMLElement): HTMLElement[] {
  const marked = [...root.querySelectorAll<HTMLElement>('[data-transition-group]')];
  if (marked.length) return marked;

  const found = [...root.querySelectorAll<HTMLElement>(GROUP_SELECTOR)];
  if (found.length) return found;

  const page = root.querySelector('.page');
  if (!page) return [root];
  return [...page.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && !el.classList.contains('hero-fx'),
  );
}

function setEnterState(groups: HTMLElement[]) {
  gsap.set(groups, {
    opacity: 0,
    scale: 0.94,
    y: 14,
    transformOrigin: '50% 8%',
    force3D: true,
  });
}

function notifyPageEnter(loc: Location) {
  window.dispatchEvent(new CustomEvent('page-enter-complete', { detail: { path: loc.pathname } }));
}

interface Layer {
  loc: Location;
  phase: 'in' | 'out';
}

interface PageTransitionProps {
  render: (location: Location) => ReactNode;
}

export function PageTransition({ render }: PageTransitionProps) {
  const location = useLocation();
  const [layers, setLayers] = useState<Layer[]>([{ loc: location, phase: 'in' }]);
  const layerEls = useRef(new Map<string, HTMLDivElement>());
  const layersRef = useRef(layers);
  const runningRef = useRef(false);
  const firstRef = useRef(true);
  const animGen = useRef(0);
  layersRef.current = layers;

  useLayoutEffect(() => {
    const currentIn = layersRef.current.find((layer) => layer.phase === 'in');
    if (!currentIn || location.key === currentIn.loc.key) return;
    runningRef.current = true;
    setLayers([
      { loc: currentIn.loc, phase: 'out' },
      { loc: location, phase: 'in' },
    ]);
  }, [location]);

  useLayoutEffect(() => {
    const inLayer = layers.find((layer) => layer.phase === 'in');
    const outLayer = layers.find((layer) => layer.phase === 'out');
    const inEl = inLayer ? layerEls.current.get(inLayer.loc.key) : undefined;
    if (!inEl || !inLayer) return;
    const enterLoc = inLayer.loc;

    if (firstRef.current) {
      firstRef.current = false;
      const groups = collectGroups(inEl);
      setEnterState(groups);
      const intro = gsap.to(groups, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
        force3D: true,
        onComplete: () => {
          gsap.set(groups, { clearProps: 'transform' });
          runningRef.current = false;
          notifyPageEnter(enterLoc);
        },
      });
      return () => {
        intro.kill();
      };
    }

    if (!outLayer) return;

    const groups = collectGroups(inEl);
    setEnterState(groups);
    gsap.set(inEl, { pointerEvents: 'none' });
    const outEl = layerEls.current.get(outLayer.loc.key);
    const gen = ++animGen.current;

    const finish = () => {
      if (gen !== animGen.current) return;
      gsap.set(groups, { clearProps: 'transform' });
      gsap.set(inEl, { pointerEvents: 'auto' });
      runningRef.current = false;
      notifyPageEnter(enterLoc);
      setLayers((prev) => prev.filter((layer) => layer.phase !== 'out'));
    };

    const tl = gsap.timeline({ onComplete: finish });

    if (outEl) {
      gsap.set(outEl, { opacity: 1 });
      tl.to(outEl, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0);
    }
    tl.to(
      groups,
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.42,
        stagger: 0.08,
        ease: 'power2.out',
        force3D: true,
      },
      0.3,
    );

    return () => {
      animGen.current += 1;
      tl.kill();
      runningRef.current = false;
    };
  }, [layers]);

  const transitioning = layers.some((layer) => layer.phase === 'out');

  return (
    <div className="page-stage">
      {layers.map((layer) => (
        <div
          key={layer.loc.key}
          className={`page-layer${
            layer.phase === 'out' ? ' page-layer--out' : transitioning ? ' page-layer--in' : ''
          }`}
          ref={(node) => {
            if (node) layerEls.current.set(layer.loc.key, node);
            else layerEls.current.delete(layer.loc.key);
          }}
        >
          {render(layer.loc)}
        </div>
      ))}
    </div>
  );
}
