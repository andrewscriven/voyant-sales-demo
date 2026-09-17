import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { animateDirectionalIn } from '../lib/animateIn';

interface SliderProps {
  index: number;
  count: number;
  onChange: (index: number) => void;
  children: ReactNode;
}

function Chevron() {
  return (
    <svg viewBox="0 0 492.004 492.004" fill="currentColor" aria-hidden="true">
      <path d="M382.678,226.804L163.73,7.86C158.666,2.792,151.906,0,144.698,0s-13.968,2.792-19.032,7.86l-16.124,16.12c-10.492,10.504-10.492,27.576,0,38.064L293.398,245.9l-184.06,184.06c-5.064,5.068-7.86,11.824-7.86,19.028c0,7.212,2.796,13.968,7.86,19.04l16.124,16.116c5.068,5.068,11.824,7.86,19.032,7.86s13.968-2.792,19.032-7.86L382.678,265c5.076-5.084,7.864-11.872,7.848-19.088C390.542,238.668,387.754,231.884,382.678,226.804z" />
    </svg>
  );
}

export function Slider({ index, count, onChange, children }: SliderProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const prevIndex = useRef(index);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      prevIndex.current = index;
      return;
    }
    if (index === prevIndex.current) return;
    const direction = index > prevIndex.current ? 1 : -1;
    prevIndex.current = index;
    animateDirectionalIn(paneRef.current, direction);
  }, [index]);

  const stage = (
    <div className="slider-stage">
      <div className="slider-pane" ref={paneRef}>
        {children}
      </div>
    </div>
  );

  if (count <= 1) {
    return <div className="slider">{stage}</div>;
  }

  return (
    <div className="slider">
      {stage}
      <button
        type="button"
        className="slider-nav slider-prev"
        aria-label="Previous"
        disabled={index <= 0}
        onClick={() => onChange(index - 1)}
      >
        <Chevron />
      </button>
      <button
        type="button"
        className="slider-nav slider-next"
        aria-label="Next"
        disabled={index >= count - 1}
        onClick={() => onChange(index + 1)}
      >
        <Chevron />
      </button>
      <div className="slider-dots">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? 'is-active' : ''}
            aria-label={`Slide ${i + 1}`}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
    </div>
  );
}
