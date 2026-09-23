import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { animateStaggerIn } from '../lib/animateIn';

interface TabStageProps {
  active: string;
  itemSelector?: string;
  children: ReactNode;
}

function paneHeight(pane: HTMLElement) {
  return Math.max(pane.offsetHeight, pane.scrollHeight);
}

export function TabStage({ active, itemSelector, children }: TabStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panes = Array.from(root.querySelectorAll<HTMLElement>('[data-tab-pane]'));
    if (!panes.length) return;

    const apply = () => {
      let max = 0;
      for (const pane of panes) {
        max = Math.max(max, paneHeight(pane));
      }
      if (max > 0) root.style.minHeight = `${max}px`;
    };

    apply();
    const ro = new ResizeObserver(apply);
    for (const pane of panes) ro.observe(pane);

    const media = panes.flatMap((pane) => Array.from(pane.querySelectorAll('img, video')));
    for (const el of media) {
      el.addEventListener('load', apply);
      el.addEventListener('loadedmetadata', apply);
    }

    return () => {
      ro.disconnect();
      for (const el of media) {
        el.removeEventListener('load', apply);
        el.removeEventListener('loadedmetadata', apply);
      }
    };
  }, [active]);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const root = rootRef.current;
    if (!root) return;
    const pane = root.querySelector<HTMLElement>(`[data-tab-pane="${active}"]`);
    if (!pane) return;
    const items = itemSelector ? pane.querySelectorAll(itemSelector) : pane.children;
    animateStaggerIn(items.length ? items : pane);
  }, [active, itemSelector]);

  return (
    <div className="tab-stage" ref={rootRef}>
      {children}
    </div>
  );
}
