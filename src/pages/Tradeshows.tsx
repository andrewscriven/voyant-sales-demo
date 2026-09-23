import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { PageChrome } from '../components/PageChrome';
import { localMedia } from '../config/site';
import './pages.css';

const photo = (file: string) => localMedia(`/images/.2026/tradeshows/${file}`);
const logo = (file: string) => localMedia(`/images/.2026/${file}`);

interface TradeshowBrand {
  id: string;
  name: string;
  logo: string;
  hub: string;
  greyscale: boolean;
  layout: 'trio' | 'ge';
  photos: string[];
}

const BRANDS: TradeshowBrand[] = [
  {
    id: 'westinghouse',
    name: 'Westinghouse',
    logo: logo('logo-westinghouse.png'),
    hub: photo('westinghouse-hub.png'),
    greyscale: false,
    layout: 'trio',
    photos: [
      photo('westinghouse-1.jpeg'),
      photo('westinghouse-2.png'),
      photo('westinghouse-3.png'),
      photo('westinghouse-4.png'),
    ],
  },
  {
    id: 'emerson',
    name: 'Emerson',
    logo: logo('logo-emerson.png'),
    hub: photo('emerson-hub.png'),
    greyscale: false,
    layout: 'trio',
    photos: [photo('emerson-1.png'), photo('emerson-2a.png'), photo('emerson-2b.png'), photo('emerson-3.png')],
  },
  {
    id: 'resa',
    name: 'RESA Power',
    logo: logo('logo-resa.png'),
    hub: photo('resa-hub.jpg'),
    greyscale: true,
    layout: 'trio',
    photos: [photo('resa-1.png'), photo('resa-2.jpeg'), photo('resa-3.jpeg'), photo('resa-4.jpg')],
  },
  {
    id: 'ge',
    name: 'GE',
    logo: logo('logo-ge.png'),
    hub: photo('ge-7.png'),
    greyscale: false,
    layout: 'ge',
    photos: [
      photo('ge-1.jpg'),
      photo('ge-2.png'),
      photo('ge-3.png'),
      photo('ge-4.png'),
      photo('ge-5.jpeg'),
      photo('ge-6.png'),
      photo('ge-7.png'),
    ],
  },
];

function BrandMark({ brand, className }: { brand: TradeshowBrand; className?: string }) {
  return (
    <img
      className={`${className ?? ''}${brand.greyscale ? ' is-greyscale' : ''}`}
      src={brand.logo}
      alt={brand.name}
    />
  );
}

function Photo({
  src,
  alt,
  className,
  onOpen,
}: {
  src: string;
  alt: string;
  className?: string;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      className={`tradeshow-photo${className ? ` ${className}` : ''}`}
      tabIndex={0}
      onClick={onOpen}
    >
      <img src={src} alt={alt} />
    </button>
  );
}

function Chevron({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 492.004 492.004" fill="currentColor" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M382.678,226.804L163.73,7.86C158.666,2.792,151.906,0,144.698,0s-13.968,2.792-19.032,7.86l-16.124,16.12c-10.492,10.504-10.492,27.576,0,38.064L293.398,245.9l-184.06,184.06c-5.064,5.068-7.86,11.824-7.86,19.028c0,7.212,2.796,13.968,7.86,19.04l16.124,16.116c5.068,5.068,11.824,7.86,19.032,7.86s13.968-2.792,19.032-7.86L382.678,265c5.076-5.084,7.864-11.872,7.848-19.088C390.542,238.668,387.754,231.884,382.678,226.804z" />
    </svg>
  );
}

export function Tradeshows() {
  const { brand: brandParam } = useParams();
  const navigate = useNavigate();
  const brand = BRANDS.find((item) => item.id === brandParam);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    setViewer(null);
  }, [brandParam]);

  useEffect(() => {
    if (viewer === null || !brand) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewer(null);
      if (event.key === 'ArrowRight') {
        setViewer((i) => (i === null || i >= brand.photos.length - 1 ? i : i + 1));
      }
      if (event.key === 'ArrowLeft') {
        setViewer((i) => (i === null || i <= 0 ? i : i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, brand]);

  return (
    <div className="page page-inner page-tradeshows">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Immersive Experiences at Tradeshows</h1>
          {!brand && (
            <p className="page-sub page-sub-full">
              Driving customer engagement at shows and events globally
            </p>
          )}
        </div>
        <div className="page-main">
          {!brand ? (
            <div className="tradeshow-hub">
              {BRANDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="tradeshow-hub-btn"
                  onClick={() => navigate(`/tradeshows/${item.id}`)}
                >
                  <span className="tradeshow-hub-mark">
                    <BrandMark brand={item} className={`tradeshow-hub-logo is-${item.id}`} />
                  </span>
                  <span className="tradeshow-hub-shot">
                    <img src={item.hub} alt={item.name} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tradeshow-brand-stage">
              <div className="tradeshow-brand-rule">
                <BrandMark brand={brand} className={`tradeshow-brand-logo is-${brand.id}`} />
              </div>
              {brand.layout === 'ge' ? (
                <div className="tradeshow-ge">
                  <Photo src={brand.photos[0]} alt={brand.name} className="is-ge-wide" onOpen={() => setViewer(0)} />
                  <Photo src={brand.photos[2]} alt={brand.name} className="is-ge-top-end" onOpen={() => setViewer(2)} />
                  <Photo src={brand.photos[1]} alt={brand.name} onOpen={() => setViewer(1)} />
                  {brand.photos.slice(3).map((src, i) => (
                    <Photo key={src} src={src} alt={brand.name} onOpen={() => setViewer(i + 3)} />
                  ))}
                </div>
              ) : (
                <div className={`tradeshow-trio${brand.photos.length === 3 ? ' is-collage-center' : ''}`}>
                  <Photo src={brand.photos[0]} alt={brand.name} onOpen={() => setViewer(0)} />
                  <div className="tradeshow-trio-mid">
                    {brand.photos.length === 3 ? (
                      <Photo src={brand.photos[1]} alt={brand.name} onOpen={() => setViewer(1)} />
                    ) : (
                      <>
                        <Photo src={brand.photos[1]} alt={brand.name} onOpen={() => setViewer(1)} />
                        <Photo src={brand.photos[2]} alt={brand.name} onOpen={() => setViewer(2)} />
                      </>
                    )}
                  </div>
                  <Photo
                    src={brand.photos[brand.photos.length - 1]}
                    alt={brand.name}
                    onOpen={() => setViewer(brand.photos.length - 1)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </PageChrome>
      {brand && viewer !== null &&
        createPortal(
          <div className="tradeshow-lightbox" role="presentation" onClick={() => setViewer(null)}>
            <button type="button" className="tradeshow-lightbox-close" aria-label="Close" onClick={() => setViewer(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <div
              className="tradeshow-lightbox-stage"
              role="dialog"
              aria-modal="true"
              aria-label={`${brand.name} photos`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="tradeshow-lightbox-nav is-prev"
                aria-label="Previous"
                disabled={viewer <= 0}
                onClick={() => setViewer((i) => (i === null || i <= 0 ? i : i - 1))}
              >
                <Chevron flip />
              </button>
              <img key={viewer} className="tradeshow-lightbox-shot" src={brand.photos[viewer]} alt={brand.name} />
              <button
                type="button"
                className="tradeshow-lightbox-nav is-next"
                aria-label="Next"
                disabled={viewer >= brand.photos.length - 1}
                onClick={() => setViewer((i) => (i === null || i >= brand.photos.length - 1 ? i : i + 1))}
              >
                <Chevron />
              </button>
              <div className="tradeshow-lightbox-dots">
                {brand.photos.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={i === viewer ? 'is-active' : ''}
                    aria-label={`Photo ${i + 1}`}
                    onClick={() => setViewer(i)}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
