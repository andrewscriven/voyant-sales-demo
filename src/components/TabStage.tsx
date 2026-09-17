import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { animateStaggerIn } from '../lib/animateIn';

interface TabStageProps {
  active: string;
  itemSelector?: string;
  children: ReactNode;
}

export function TabStage({ active, itemSelector, children }: TabStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

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
