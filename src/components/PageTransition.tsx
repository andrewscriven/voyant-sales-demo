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

interface PageTransitionProps {
  render: (location: Location) => ReactNode;
}

export function PageTransition({ render }: PageTransitionProps) {
  const location = useLocation();
  const [incoming, setIncoming] = useState(location);
  const [outgoing, setOutgoing] = useState<Location | null>(null);
  const incomingRef = useRef<HTMLDivElement>(null);
  const outgoingRef = useRef<HTMLDivElement>(null);
  const incomingLocRef = useRef(incoming);
  const runningRef = useRef(false);
  const queueRef = useRef<Location | null>(null);
  const firstRef = useRef(true);
  incomingLocRef.current = incoming;

  useLayoutEffect(() => {
    if (location.key === incomingLocRef.current.key) return;
    if (runningRef.current) {
      queueRef.current = location;
      return;
    }
    runningRef.current = true;
    setOutgoing(incomingLocRef.current);
    setIncoming(location);
  }, [location]);

  useLayoutEffect(() => {
    const inEl = incomingRef.current;
    if (!inEl) return;

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
        },
      });
      return () => {
        intro.kill();
      };
    }

    if (!outgoing) return;

    const groups = collectGroups(inEl);
    setEnterState(groups);
    const outEl = outgoingRef.current;
    gsap.set(inEl, { pointerEvents: 'none' });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(groups, { clearProps: 'transform' });
        gsap.set(inEl, { pointerEvents: 'auto' });
        setOutgoing(null);
        runningRef.current = false;
        const queued = queueRef.current;
        if (queued && queued.key !== incomingLocRef.current.key) {
          queueRef.current = null;
          runningRef.current = true;
          setOutgoing(incomingLocRef.current);
          setIncoming(queued);
        }
      },
    });

    if (outEl) {
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
      tl.kill();
    };
  }, [incoming, outgoing]);

  return (
    <div className="page-stage">
      {outgoing ? (
        <div className="page-layer page-layer--out" ref={outgoingRef}>
          {render(outgoing)}
        </div>
      ) : null}
      <div className={`page-layer${outgoing ? ' page-layer--in' : ''}`} ref={incomingRef}>
        {render(incoming)}
      </div>
    </div>
  );
}
