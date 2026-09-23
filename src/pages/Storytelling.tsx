import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NeonIcon, type IconName } from '../components/NeonIcon';
import { PageChrome } from '../components/PageChrome';
import { Slider } from '../components/Slider';
import { TabStage } from '../components/TabStage';
import { Tabs } from '../components/Tabs';
import { localMedia } from '../config/site';
import { animateDirectionalIn } from '../lib/animateIn';
import './pages.css';

const CAPS: { title: string; body: string; icon: IconName }[] = [
  {
    title: 'Consistent Messaging',
    body: 'A consistent value story is created ensuring every salesperson can tell the same clear, compelling narrative, so customers hear a unified message.',
    icon: 'add-comment-check',
  },
  {
    title: 'Quantified Customer Pain Points',
    body: 'Customer and industry challenges are quantified and visualized in real-world applications, so the problems and their impact are clear.',
    icon: 'percent-discount',
  },
  {
    title: 'Value Props & Differentiators',
    body: 'Quantified benefits and outcomes are crafted to guide the sales conversation, backed by visuals that make your solutions’ value and competitive edge crystal clear.',
    icon: 'mountain-flag',
  },
  {
    title: 'Accelerated Storytelling',
    body: 'Leveraging our library of statistics, templates, and 3D assets, you get to a finished storyboard faster, with clearer narratives and richer visuals.',
    icon: 'rocket-launch',
  },
];

const TOOLS: {
  id: string;
  label: string;
  title: string;
  heading?: ReactNode;
  body: string;
  image: string;
}[] = [
  {
    id: 'stats',
    label: 'Challenge Statistics',
    title: 'Library of Industry & Customer Pain Points',
    heading: (
      <>
        Library of Industry &amp;
        <br />
        Customer Pain Points
      </>
    ),
    body: 'Access to thousands of industry statistics from our library aids in quickly and clearly describing your customers’ challenges and quantify their impact.',
    image: localMedia('/images/.2026/library-challenge-statistics.png'),
  },
  {
    id: 'value',
    label: 'Value Prop Creation',
    title: 'Library of Value Prop. Examples',
    body: 'Hundreds of examples of differentiated value propositions are available in our library to aid in describing your solution’s quantified value.',
    image: localMedia('/images/.2026/library-value-prop.png'),
  },
  {
    id: 'boards',
    label: 'Storyboarding Templates',
    title: 'Library of Storyboarding Templates',
    body: 'Our library of editable templates enable quick collaboration with your teams to develop an engaging storyboard to be used to create your Interactive Demos.',
    image: localMedia('/images/storyboarding-template.jpg'),
  },
  {
    id: 'anim',
    label: '3D Animations',
    title: 'Library of 3D Animations',
    body: 'Access to hundreds of technically accurate 3D assets, environments and animations to aid in bringing your value-based story to life.',
    image: localMedia('/images/.2026/library-3d-animations.png'),
  },
];

export function Storytelling() {
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState(TOOLS[0].id);
  const subRef = useRef<HTMLParagraphElement>(null);
  const prevSlide = useRef(slide);
  const firstSub = useRef(true);

  useLayoutEffect(() => {
    if (firstSub.current) {
      firstSub.current = false;
      prevSlide.current = slide;
      return;
    }
    if (slide === prevSlide.current) return;
    const direction = slide > prevSlide.current ? 1 : -1;
    prevSlide.current = slide;
    animateDirectionalIn(subRef.current, direction);
  }, [slide]);

  return (
    <div className="page page-inner page-storytelling">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Value Based Storytelling</h1>
          <div className="page-sub-clip">
            <p className="page-sub" ref={subRef}>
              {slide === 0
                ? 'A robust suite of storytelling tools helps to quickly shift your message from features to business value.'
                : 'We partner with your team to craft a differentiated & value-based storyboard.'}
            </p>
          </div>
        </div>
        <div className="page-main">
          <Slider index={slide} onChange={setSlide}>
            <div className="panel">
              <h2>Suite of Storytelling Tools</h2>
              <div className="tab-content">
                <Tabs tabs={TOOLS} active={tab} onChange={setTab} />
                <TabStage active={tab} itemSelector=".split-tools">
                  {TOOLS.map((item) => (
                    <div
                      key={item.id}
                      data-tab-pane={item.id}
                      className={item.id === tab ? 'is-active' : ''}
                      aria-hidden={item.id !== tab}
                    >
                      <div className="split split-tools">
                        <img src={item.image} alt={item.title} />
                        <div className="split-copy">
                          <h3>{item.heading ?? item.title}</h3>
                          <p>{item.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabStage>
              </div>
            </div>
            <div className="panel">
              <div className="panel-box">
                <h2>Key Storytelling Deliverables &amp; Capabilities</h2>
                <div className="card-grid">
                  {CAPS.map((item) => (
                    <article key={item.title} className="card dark-card">
                      <div className="card-head">
                        <NeonIcon name={item.icon} framed />
                        <h3>{item.title}</h3>
                      </div>
                      <p>{item.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Slider>
        </div>
      </PageChrome>
    </div>
  );
}
