import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoBloomBlend } from '../hooks/useVideoBloomBlend';
import { NeonIcon, type IconName } from '../components/NeonIcon';
import { PageChrome } from '../components/PageChrome';
import { Slider } from '../components/Slider';
import { TabStage } from '../components/TabStage';
import { Tabs } from '../components/Tabs';
import { localMedia } from '../config/site';
import { animateDirectionalIn } from '../lib/animateIn';
import './pages.css';

const SLIDE_SUBS: ReactNode[] = [
  <>
    <strong>
      3D SolutionScape<sup>TM</sup>
    </strong>
    {'\u00A0\u00A0'}
    Our modular immersive experience built around your target industries
  </>,
  'Easily add content modules to scale across your key industries, real customer challenges, and your solutions',
  'See your solutions at work in real-world environments, solving the challenges your customers face.',
  'Additional sales demos for every sales situation',
  'Key sales demo capabilities that make complex solutions easy to understand, share, and scale across your sales organization.',
];

const APPLICATIONS = [
  { title: 'Renewable Applications', img: localMedia('/images/app-renewables.jpg') },
  { title: 'Power Utility Applications', img: localMedia('/images/app-power-utility.jpg') },
  { title: 'Data Center Applications', img: localMedia('/images/app-data-centers.jpg') },
  { title: 'Petrochemical Applications', img: localMedia('/images/app-petrochemical.jpg') },
  { title: 'Power Generation Applications', img: localMedia('/images/app-power-generation.jpg') },
  { title: 'Energy Storage Applications', img: localMedia('/images/app-energy-storage.jpg') },
  { title: 'Healthcare Applications', img: localMedia('/images/app-healthcare.jpg') },
  { title: 'Life Sciences Applications', img: localMedia('/images/app-life-sciences.jpg') },
];

const ADDON_TABS = [
  {
    id: 'maturity',
    label: 'Maturity Assessments',
    title: 'Digital Maturity Assessments',
    body: 'Guide prospects through a quick self-assessment that pinpoints their current stage, exposes key gaps, and connects recommended next steps to your solution.',
    image: localMedia('/images/add-ons-maturity-assess.jpg'),
    video: localMedia('/videos/2026/platform-maturity.mp4'),
    examplesTab: 'assessments',
  },
  {
    id: 'cases',
    label: 'Immersive Case Studies',
    title: 'Immersive Case Studies',
    body: 'Showcase your global customer case studies, highlighting the customer challenges addressed and solutions & value provided.',
    image: localMedia('/images/add-ons-case-studies.jpg'),
    video: localMedia('/videos/2026/platform-case-studies.mp4'),
    examplesTab: 'case-studies',
  },
  {
    id: 'calc',
    label: 'Value Calculators',
    title: 'Value Calculators',
    body: 'Identify the value and customer outcome of specific solutions to customer challenges.',
    image: localMedia('/images/add-ons-calculator.jpg'),
    video: localMedia('/videos/2026/platform-bio-calc.mp4'),
    examplesTab: 'assessments',
  },
  {
    id: 'vr',
    label: 'Virtual Reality',
    title: 'Virtual Reality',
    body: 'Experience how solutions solve real world customer challenges as if you were there.',
    image: localMedia('/images/add-ons-vr.jpg'),
    video: localMedia('/videos/2026/platform-add-ons.mp4'),
    examplesTab: 'vr',
  },
];

const CAPS: { title: string; body: string; icon: IconName }[] = [
  { title: 'One Easy-to-Use Sales Demo', body: 'Give your sales teams a single, intuitive interactive demo they can use across products, industries, & customer types.', icon: 'star-shine' },
  { title: 'Branded Interactive Experience', body: 'Showcase your solutions in a fully branded interactive demo that reflects your visuals, messaging, and story that can be easily linked from your website.', icon: 'brand-awareness' },
  { title: '3D Advanced Visualization', body: 'Simplify complex products, services, and systems with immersive 3D visuals and animations that show your solutions at work in real-world environments.', icon: 'interactive-space' },
  { title: 'Multi-Language Support', body: 'Support multiple languages in a single demo, so local teams can present in the buyers’ language while keeping messaging & the overall experience consistent.', icon: 'language' },
  { title: 'Modular & Scalable Demo Platform', body: 'Add, update, or swap demo modules as your portfolio evolves, so your sales team always has the latest content without needing to relearn the demo.', icon: 'dashboard-2-add' },
  { title: 'Offline Presenting & Auto-Updates', body: 'Run your demo anywhere, even offline, and automatically sync updates when you’re back online so sales always has the latest version.', icon: 'cloud-done' },
];

const MODULES = [
  {
    title: 'Links to Solution Overviews',
    body: 'Concise solution overviews that communicate differentiated value to target audiences, enhanced with high-quality video and consistent iconography.',
    image: localMedia('/images/build-guide/image62.png'),
  },
  {
    title: 'Links to 3D Application Solution Tours',
    body: 'Interactive 3D scenes designed to visualize real-world challenges and demonstrate solutions through engaging, easy-to-follow animations.',
    image: localMedia('/images/build-guide/image61.png'),
  },
];

export function Experiences() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [addon, setAddon] = useState(ADDON_TABS[0].id);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const prevSlide = useRef(slide);
  const firstSub = useRef(true);
  useVideoBloomBlend(heroVideoRef, slide === 0);

  useLayoutEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    if (slide === 0) void el.play();
    else el.pause();
  }, [slide]);

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
    <div className="page page-inner page-experiences">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Immersive Experiences</h1>
          <p className="page-sub page-sub-full" ref={subRef}>
            {SLIDE_SUBS[slide]}
          </p>
        </div>
        <div className="page-main">
          <Slider index={slide} onChange={setSlide}>
            <div className="panel panel-hero-video">
              <div className="panel-hero-video-frame">
                <video
                  ref={heroVideoRef}
                  className="wide-media"
                  src={localMedia('/videos/modular-landscape-v3.mp4')}
                  autoPlay={slide === 0}
                  muted
                  playsInline
                  onEnded={(event) => {
                    const el = event.currentTarget;
                    el.currentTime = 4;
                    void el.play();
                  }}
                />
              </div>
            </div>
            <div className="panel">
              <div className="split">
                {MODULES.map((item) => (
                  <article key={item.title}>
                    <h3>{item.title}</h3>
                    <img src={item.image} alt={item.title} />
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="app-grid">
                {APPLICATIONS.map((item) => (
                  <figure key={item.title}>
                    <img src={item.img} alt={item.title} />
                    <figcaption>{item.title}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="tab-content">
                <Tabs tabs={ADDON_TABS} active={addon} onChange={setAddon} />
                <TabStage active={addon} itemSelector=".split-tools">
                  {ADDON_TABS.map((item) => {
                    const active = item.id === addon;
                    return (
                      <div
                        key={item.id}
                        data-tab-pane={item.id}
                        className={active ? 'is-active' : ''}
                        aria-hidden={!active}
                      >
                        <div className="split split-tools">
                          <div className="device-frame">
                            <div className="device-screen">
                              <video
                                src={item.video}
                                poster={item.image}
                                autoPlay={active && slide === 3}
                                muted
                                loop
                                playsInline
                                ref={(el) => {
                                  if (!el) return;
                                  if (active && slide === 3) void el.play();
                                  else el.pause();
                                }}
                              />
                            </div>
                          </div>
                          <div className="split-copy">
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                            <div className="text-links">
                              <button
                                type="button"
                                onClick={() => navigate(`/examples/${item.examplesTab}`)}
                              >
                                Learn More
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabStage>
              </div>
            </div>
            <div className="panel">
              <div className="panel-box panel-box--flush">
                <div className="card-grid three">
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
