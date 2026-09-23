import { useLayoutEffect, useRef } from 'react';
import { animateStaggerIn } from '../lib/animateIn';

interface PaginationProps {
  index: number;
  count: number;
  onChange: (index: number) => void;
}

export function Pagination({ index, count, onChange }: PaginationProps) {
  const rootRef = useRef<HTMLElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (!first.current) return;
    first.current = false;
    const buttons = rootRef.current?.querySelectorAll('button');
    if (buttons?.length) animateStaggerIn(buttons);
  }, []);

  if (count <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination" ref={rootRef}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className={i === index ? 'is-active' : ''}
          aria-label={`Page ${i + 1}`}
          aria-current={i === index ? 'page' : undefined}
          onClick={() => onChange(i)}
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );
}
