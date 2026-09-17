import { localMedia } from './site';

export interface HomeVideo {
  id: string;
  src: string;
  caption: string;
}

export const HOME_VIDEOS: HomeVideo[] = [
  {
    id: 'hero-1',
    src: localMedia('/videos/2026/homepage/homepage-hero-1.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-2',
    src: localMedia('/videos/2026/homepage/homepage-hero-2.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-3',
    src: localMedia('/videos/2026/homepage/homepage-hero-3.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-4',
    src: localMedia('/videos/2026/homepage/homepage-hero-4.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-5',
    src: localMedia('/videos/2026/homepage/homepage-hero-5.mp4'),
    caption: 'to Easily Track Usage & Drive Lead Generation',
  },
];

export const LAST_VIDEO_KEY = 'voyant-sales-demo.last-home-video';
