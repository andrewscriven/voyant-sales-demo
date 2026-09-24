import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { LaunchModal } from '../components/LaunchModal';
import { PageChrome } from '../components/PageChrome';
import { Pagination } from '../components/Pagination';
import { TabStage } from '../components/TabStage';
import { Tabs } from '../components/Tabs';
import { EXAMPLE_CARDS, EXAMPLE_TABS, type ExampleCard } from '../config/examples';
import { useDemos } from '../hooks/useDemos';
import { animateDirectionalIn } from '../lib/animateIn';
import './pages.css';

type TabId = (typeof EXAMPLE_TABS)[number]['id'];

const OVERLAY_DELAY_MS = 500;
const OVERLAY_HOLD_MS = 5000;

function ExamplePanel({ card, onActivate }: { card: ExampleCard; onActivate: () => void }) {
  const [overlay, setOverlay] = useState<'hidden' | 'visible' | 'leaving'>('hidden');
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  // Purely time-based: every click waits 500ms, shows for 5s, then fades.
  const handleClick = () => {
    clearTimers();
    setOverlay('hidden');
    timersRef.current.push(
      window.setTimeout(() => setOverlay('visible'), OVERLAY_DELAY_MS),
      window.setTimeout(() => setOverlay('leaving'), OVERLAY_DELAY_MS + OVERLAY_HOLD_MS),
      window.setTimeout(() => setOverlay('hidden'), OVERLAY_DELAY_MS + OVERLAY_HOLD_MS + 300),
    );
    onActivate();
  };

  return (
    <button
      type="button"
      className={`example-card${overlay !== 'hidden' ? ' is-launching' : ''}`}
      onClick={handleClick}
    >
      <span className="example-thumb">
        <span className="example-shot">
          <img src={card.image} alt={card.brand} />
          {overlay !== 'hidden' && (
            <span className={`example-launching${overlay === 'leaving' ? ' is-leaving' : ''}`}>
              Launching…
            </span>
          )}
        </span>
      </span>
      <span className="example-brand">
        {card.brand} <em>| {card.industry}</em>
      </span>
    </button>
  );
}

function ExamplePager({
  index,
  onChange,
  children,
}: {
  index: number;
  onChange: (index: number) => void;
  children: ReactNode;
}) {
  const pages = Children.toArray(children);
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

  return (
    <div className="example-pager">
      <div className="example-pager-stage">
        {pages.map((page, i) => (
          <div
            key={i}
            className={`example-pager-page${i === index ? ' is-active' : ''}`}
            ref={i === index ? paneRef : undefined}
            aria-hidden={i !== index}
          >
            {page}
          </div>
        ))}
      </div>
      <Pagination index={index} count={pages.length} onChange={onChange} />
    </div>
  );
}

function tabFromSearch(value: string | null): TabId {
  return EXAMPLE_TABS.some((item) => item.id === value) ? (value as TabId) : 'tours';
}

export function Examples() {
  const {
    busyId,
    activate,
    prompt,
    message,
    closePrompt,
    browsePromptPath,
    launchFromPrompt,
  } = useDemos();
  const { tab: tabParam } = useParams();
  const requestedTab = tabFromSearch(tabParam ?? null);
  const [tab, setTab] = useState<TabId>(requestedTab);
  const [pages, setPages] = useState<Partial<Record<TabId, number>>>({});

  useEffect(() => {
    setTab(requestedTab);
  }, [requestedTab]);

  return (
    <div className="page page-inner">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Immersive Experience Examples</h1>
        </div>
        <div className="page-main">
          <div className="examples-shell">
            <Tabs tabs={[...EXAMPLE_TABS]} active={tab} onChange={(id) => setTab(id as TabId)} />
            <TabStage active={tab} itemSelector=".example-card">
              {EXAMPLE_TABS.map((item) => {
                const cards = EXAMPLE_CARDS.filter((card) => card.tab === item.id);
                const page = pages[item.id] ?? 0;
                const pageCount = Math.max(1, ...cards.map((card) => card.page + 1));
                return (
                  <div
                    key={item.id}
                    data-tab-pane={item.id}
                    className={item.id === tab ? 'is-active' : ''}
                    aria-hidden={item.id !== tab}
                  >
                    <ExamplePager
                      index={page}
                      onChange={(index) => setPages((prev) => ({ ...prev, [item.id]: index }))}
                    >
                      {Array.from({ length: pageCount }, (_, pageIndex) => {
                        const visible = cards.filter((card) => card.page === pageIndex);
                        return (
                          <div key={pageIndex} className={`example-grid ${visible.length <= 4 ? 'four' : ''}`}>
                            {visible.map((card) => (
                                <ExamplePanel
                                  key={card.id}
                                  card={card}
                                  onActivate={() => void activate(card.id)}
                                />
                            ))}
                          </div>
                        );
                      })}
                    </ExamplePager>
                  </div>
                );
              })}
            </TabStage>
          </div>
        </div>
      </PageChrome>
      {prompt && (
        <LaunchModal
          prompt={prompt}
          busy={busyId === prompt.id}
          note={message}
          onClose={closePrompt}
          onBrowse={browsePromptPath}
          onLaunch={launchFromPrompt}
        />
      )}
    </div>
  );
}
