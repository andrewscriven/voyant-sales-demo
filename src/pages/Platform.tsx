import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageChrome } from '../components/PageChrome';
import { ANALYTICS_DEMO, localMedia, openWebLink } from '../config/site';
import './pages.css';

const GLOW_HOLD_MS = 3000;
const GLOW_PULSE_MS = 1500;
const GLOW_STAGGER_MS = 250;
const GLOW_LOOP_GAP_MS = 5000;

const COLUMNS: {
  title: string;
  body: string;
  icon: string;
  links: { label: string; path?: string; href?: string }[];
}[] = [
  {
    title: 'Value Based Storytelling',
    body: 'Quickly change your sales conversations from “Feature” selling to “Value” selling',
    icon: localMedia('/images/.2026/icon-pillar-storytelling.png'),
    links: [{ label: 'Learn More', path: '/storytelling' }],
  },
  {
    title: 'Immersive Experiences',
    body: 'Leverage interactive sales demos based on the value based storytelling created.',
    icon: localMedia('/images/.2026/icon-pillar-immersive.png'),
    links: [
      { label: 'Learn More', path: '/experiences' },
      { label: 'View Examples', path: '/examples' },
    ],
  },
  {
    title: 'Scalable Deployment',
    body: 'Provide secure access to your interactive sales demo with easy-to-use controls',
    icon: localMedia('/images/.2026/icon-pillar-scalable.png'),
    links: [{ label: 'Learn More', path: '/user-management' }],
  },
  {
    title: 'Analytics & Lead Gen.',
    body: 'Automatically collect Lead Gen. info to identify new sales opportunities.',
    icon: localMedia('/images/.2026/icon-pillar-analytics.png'),
    links: [
      { label: 'Learn More', path: '/analytics' },
      { label: 'View Demo', href: ANALYTICS_DEMO },
    ],
  },
];

export function Platform() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const icons = Array.from(page.querySelectorAll<HTMLElement>('.platform-icon'));
    const timeouts: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timeouts.push(window.setTimeout(fn, ms));
    };

    const pulseSequence = () => {
      icons.forEach((icon, index) => {
        later(index * GLOW_STAGGER_MS, () => {
          icon.classList.remove('is-pulsing');
          void icon.offsetWidth;
          icon.classList.add('is-pulsing');
        });
      });
      const sequenceMs = (icons.length - 1) * GLOW_STAGGER_MS + GLOW_PULSE_MS;
      later(sequenceMs + GLOW_LOOP_GAP_MS, pulseSequence);
    };

    let started = false;
    const startAfterHold = () => {
      if (started) return;
      started = true;
      later(GLOW_HOLD_MS, pulseSequence);
    };

    const onEnter = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (path && path !== '/platform') return;
      startAfterHold();
    };

    window.addEventListener('page-enter-complete', onEnter);
    later(1000, startAfterHold);
    return () => {
      window.removeEventListener('page-enter-complete', onEnter);
      timeouts.forEach((id) => window.clearTimeout(id));
      icons.forEach((icon) => icon.classList.remove('is-pulsing'));
    };
  }, []);

  return (
    <div className="page page-platform" ref={pageRef}>
      <PageChrome banner={null}>
        <div className="platform-head">
          <h1 className="platform-title">Immersive Selling Platform</h1>
          <p className="platform-intro">
            Our End-to-End Immersive Selling Platform lets us <strong>deliver interactive demos fast</strong> since
            <br />
            the most <strong>complex pieces are already built</strong> &amp; ready to adapt to your needs.
          </p>
        </div>
        <div className="platform-features">
          <div className="platform-groups">
            <span>Interactive Sales Demos</span>
            <span>Sales Deployment Tools</span>
          </div>
          <div className="platform-grid">
            {COLUMNS.map((column) => (
              <article key={column.title} className="platform-col">
                <img className="platform-icon" src={column.icon} alt="" />
                <h2>{column.title}</h2>
                <p>{column.body}</p>
                <div className="text-links text-links-stack">
                  {column.links.map((link) => (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => {
                        if (link.href) openWebLink(link.href);
                        else if (link.path) navigate(link.path);
                      }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </PageChrome>
    </div>
  );
}
