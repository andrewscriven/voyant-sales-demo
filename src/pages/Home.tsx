import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { NeonIcon, type IconName } from '../components/NeonIcon';
import { HOME_VIDEOS, LAST_VIDEO_KEY } from '../config/videos';
import './pages.css';

const FEATURES: { title: string; icon: IconName }[] = [
  { title: 'Scale Sales Expertise', icon: 'groups' },
  { title: 'Ensure Consistent Messaging', icon: 'add-comment-check' },
  { title: 'Sell Value, Not Just Features', icon: 'mountain-flag' },
  { title: 'Simplify Complex Concepts', icon: 'star-shine' },
  { title: 'Enhance Engagement & Impact', icon: 'rocket-launch' },
  { title: 'Fast Track Sales Onboarding', icon: 'ads-click' },
];

function readLastVideo() {
  const stored = window.localStorage.getItem(LAST_VIDEO_KEY);
  const index = HOME_VIDEOS.findIndex((video) => video.id === stored);
  return index >= 0 ? index : 0;
}

export function Home() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(readLastVideo);
  const [barOpen, setBarOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const videos = screenRef.current?.querySelectorAll('video');
    if (!videos) return;
    videos.forEach((el, i) => {
      if (i === index) {
        el.currentTime = 0;
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [index]);

  useLayoutEffect(() => {
    const panel = featuresRef.current;
    if (!panel) return;
    const items = panel.querySelectorAll('.home-feature');

    if (!readyRef.current) {
      readyRef.current = true;
      gsap.set(panel, { height: 0, overflow: 'hidden' });
      gsap.set(items, { opacity: 0, scale: 0.84 });
      if (!barOpen) return;
    }

    const tl = gsap.timeline();
    if (barOpen) {
      tl.to(panel, { height: 'auto', duration: 0.45, ease: 'power3.out' }, 0);
      tl.to(items, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      }, 0.28);
    } else {
      tl.to(items, { opacity: 0, scale: 0.84, duration: 0.16, stagger: 0.02, ease: 'power1.in' }, 0);
      tl.to(panel, { height: 0, duration: 0.35, ease: 'power2.inOut' }, 0.06);
    }

    return () => {
      tl.kill();
    };
  }, [barOpen]);

  const select = (next: number) => {
    const wrapped = (next + HOME_VIDEOS.length) % HOME_VIDEOS.length;
    setIndex(wrapped);
    window.localStorage.setItem(LAST_VIDEO_KEY, HOME_VIDEOS[wrapped].id);
  };

  return (
    <div className={`page page-home ${barOpen ? 'is-expanded' : ''}`}>
      <div className="home-anchor">
      <div className="home">
        <div className="home-copy">
          <h1>
            <span className="hero-kicker">Immersive &amp; Interactive</span>
            <span className="heading-gradient">B2B Sales Demos</span>
          </h1>
          <p className="lede">
            <strong>Lead with demos, not slide decks.</strong> Show your solutions in action,
            solving real customer challenges.
          </p>
          <div className="home-actions">
            <button type="button" className="btn-light" onClick={() => navigate('/platform')}>
              Platform
            </button>
            <button type="button" className="btn-light" onClick={() => navigate('/offerings')}>
              Offerings
            </button>
          </div>
        </div>

        <div className="home-stage">
          <div className="home-media">
            <div className="device-frame">
              <div className="device-screen" ref={screenRef}>
                {HOME_VIDEOS.map((item, i) => (
                  <video
                    key={item.id}
                    className={i === index ? 'is-active' : ''}
                    src={item.src}
                    muted
                    loop
                    playsInline
                    preload="auto"
                    autoPlay={i === index}
                  />
                ))}
              </div>
            </div>
            <button type="button" className="home-next" aria-label="Next video" onClick={() => select(index + 1)}>
              <svg viewBox="0 0 492.004 492.004" fill="currentColor">
                <path d="M382.678,226.804L163.73,7.86C158.666,2.792,151.906,0,144.698,0s-13.968,2.792-19.032,7.86l-16.124,16.12c-10.492,10.504-10.492,27.576,0,38.064L293.398,245.9l-184.06,184.06c-5.064,5.068-7.86,11.824-7.86,19.028c0,7.212,2.796,13.968,7.86,19.04l16.124,16.116c5.068,5.068,11.824,7.86,19.032,7.86s13.968-2.792,19.032-7.86L382.678,265c5.076-5.084,7.864-11.872,7.848-19.088C390.542,238.668,387.754,231.884,382.678,226.804z" />
              </svg>
            </button>
          </div>
          <div className="home-caption-stack">
            {HOME_VIDEOS.map((item, i) => (
              <p
                key={item.id}
                className={`home-caption${i === index ? ' is-active' : ''}`}
                aria-hidden={i !== index}
              >
                {item.caption}
              </p>
            ))}
          </div>
          <div className="home-dots">
            {HOME_VIDEOS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={i === index ? 'is-active' : ''}
                aria-label={item.caption}
                onClick={() => select(i)}
              />
            ))}
          </div>
        </div>
      </div>
      </div>

      <div className="home-footer">
        <div className="home-drawer">
          <div className="home-rule">
            <button
              type="button"
              className={`home-transform ${barOpen ? 'is-open' : ''}`}
              aria-expanded={barOpen}
              onClick={() => setBarOpen((open) => !open)}
            >
              Transform your selling experience
              <svg className="home-transform-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                <line className="home-transform-h" x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <line className="home-transform-v" x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="home-features" ref={featuresRef} aria-hidden={!barOpen}>
            <div className="home-features-inner">
              {FEATURES.map((item) => (
                <div key={item.title} className="home-feature">
                  <NeonIcon name={item.icon} framed />
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="page-copy">© 2026 Voyant Studios™</p>
    </div>
  );
}
