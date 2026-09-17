import { useLayoutEffect, useRef, useState } from 'react';
import { PageChrome } from '../components/PageChrome';
import { Slider } from '../components/Slider';
import { localMedia } from '../config/site';
import { animateDirectionalIn } from '../lib/animateIn';
import './pages.css';

const SLIDE_SUBS = [
  'Easily deploy Immersive Sales Demos across the customer buying cycle to drive deeper customer engagement.',
  'Grant sales partners instant access to immersive demos and automatically send invitations.',
  'Let customers self-register for instant access and generate leads',
];

const DEPLOY_SCENES = [
  {
    src: localMedia('/images/events-blue.png'),
    alt: 'Tradeshows and events',
    title: 'Tradeshows & Events',
    wide: true,
  },
  {
    src: localMedia('/images/training-blue.png'),
    alt: 'Sales training',
    title: 'Sales Training',
  },
  {
    src: localMedia('/images/tradeshows-blue.png'),
    alt: 'Demo centers',
    title: 'Demo Centers',
  },
  {
    src: localMedia('/images/sales-meeting.png'),
    alt: 'Sales meetings',
    title: 'Global Sales Teams',
    wide: true,
    grow: true,
    overlays: [
      { label: 'In-Person', position: 'left' as const },
      { label: 'Remote', position: 'right' as const },
    ],
  },
  {
    src: localMedia('/images/.2026/platform-scalable/Global.png'),
    alt: 'Global deployment across the world',
    globe: true,
  },
  {
    src: localMedia('/images/customers-online.png'),
    alt: 'Customers online',
    title: 'Customers Online',
    compact: true,
  },
];

export function UserManagement() {
  const [slide, setSlide] = useState(0);
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
    <div className="page page-inner page-user-mgmt">
      <div className={`user-mgmt-glow${slide === 0 ? ' is-on' : ''}`} aria-hidden="true" />
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">User Management</h1>
          <p className="page-sub page-sub-full" ref={subRef}>
            {SLIDE_SUBS[slide]}
          </p>
        </div>
        <div className="page-main">
          <Slider index={slide} count={3} onChange={setSlide}>
            {slide === 0 && (
              <div className="panel panel-deploy">
                <div className="deploy-scenes">
                  {[DEPLOY_SCENES.slice(0, 3), DEPLOY_SCENES.slice(3)].map((row, rowIndex) => (
                    <div className="deploy-scenes-row" key={rowIndex}>
                      {row.map((scene) => (
                        <div
                          className={`deploy-scene-cell${scene.globe ? ' deploy-scene-globe' : ''}`}
                          key={scene.alt}
                        >
                          <div className="deploy-scene-media">
                            <div
                              className={`deploy-scene-frame${scene.globe ? ' deploy-scene-frame-full' : ''}${scene.wide ? ' deploy-scene-frame-wide' : ''}${scene.compact ? ' deploy-scene-frame-compact' : ''}${scene.grow ? ' deploy-scene-frame-grow' : ''}`}
                            >
                              <img
                                src={scene.src}
                                alt={scene.alt}
                                className={`deploy-scene-img${scene.globe ? ' deploy-scene-img-scale' : ''}`}
                              />
                              {scene.overlays?.map((overlay) => (
                                <span
                                  key={overlay.label}
                                  className={`deploy-scene-overlay is-${overlay.position}`}
                                >
                                  {overlay.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          {scene.title ? <p className="deploy-scene-title">{scene.title}</p> : null}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {slide === 1 && (
              <div className="panel panel-partners">
                <div className="partner-access">
                  <img
                    src={localMedia('/images/user-mgmt-instant-access.png')}
                    alt="Partner invitations"
                    className="partner-access-people"
                  />
                  <img
                    src={localMedia('/images/user-management-demo.png')}
                    alt="Electrical Substation Solutions interactive sales demo"
                    className="partner-access-demo"
                  />
                </div>
              </div>
            )}
            {slide === 2 && (
              <div className="panel panel-register">
                <img src={localMedia('/images/user-mgmt-instant-registration.png')} alt="Customer registration journey" />
              </div>
            )}
          </Slider>
        </div>
      </PageChrome>
    </div>
  );
}
