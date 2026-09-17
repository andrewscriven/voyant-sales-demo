import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LaunchModal } from '../components/LaunchModal';
import { PageChrome } from '../components/PageChrome';
import { Slider } from '../components/Slider';
import { TabStage } from '../components/TabStage';
import { Tabs } from '../components/Tabs';
import { EXAMPLE_CARDS, EXAMPLE_TABS, type ExampleCard } from '../config/examples';
import { useDemos } from '../hooks/useDemos';
import './pages.css';

type TabId = (typeof EXAMPLE_TABS)[number]['id'];

function ExamplePanel({
  card,
  running,
  busy,
  onLaunch,
}: {
  card: ExampleCard;
  running: boolean;
  busy: boolean;
  onLaunch: () => void;
}) {
  return (
    <button
      type="button"
      className="example-card"
      disabled={busy}
      onClick={onLaunch}
    >
      <span className="example-thumb">
        <img src={card.image} alt={card.brand} />
        {running && <span className="example-live">Running</span>}
      </span>
      <span className="example-brand">
        {card.brand} <em>| {card.industry}</em>
      </span>
    </button>
  );
}

function tabFromSearch(value: string | null): TabId {
  return EXAMPLE_TABS.some((item) => item.id === value) ? (value as TabId) : 'tours';
}

export function Examples() {
  const {
    demos,
    busyId,
    prompt,
    message,
    closePrompt,
    browsePromptPath,
    launchFromPrompt,
    launch,
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
                const visible = cards.filter((card) => card.page === page);
                return (
                  <div
                    key={item.id}
                    data-tab-pane={item.id}
                    className={item.id === tab ? 'is-active' : ''}
                    aria-hidden={item.id !== tab}
                  >
                    <Slider
                      index={page}
                      count={pageCount}
                      onChange={(index) => setPages((prev) => ({ ...prev, [item.id]: index }))}
                    >
                      <div className={`example-grid ${visible.length <= 4 ? 'four' : ''}`}>
                        {visible.map((card) => {
                          const demo = demos.find((entry) => entry.id === card.id);
                          return (
                            <ExamplePanel
                              key={card.id}
                              card={card}
                              running={Boolean(demo?.running.length)}
                              busy={busyId === card.id}
                              onLaunch={() => void launch(card.id)}
                            />
                          );
                        })}
                      </div>
                    </Slider>
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
