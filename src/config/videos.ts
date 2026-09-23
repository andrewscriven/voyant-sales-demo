import { localMedia } from './site';

export interface HomeVideo {
  id: string;
  src: string;
  caption: string;
}

/** Bust browser/media-element cache when a public homepage mp4 is replaced. */
const HOME_VIDEO_REV = '20260918-155508';
const homeVideo = (file: string) => `${localMedia(`/videos/2026/homepage/${file}`)}?v=${HOME_VIDEO_REV}`;

export const HOME_VIDEOS: HomeVideo[] = [
  {
    id: 'hero-1',
    src: homeVideo('homepage-hero-1.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-2',
    src: homeVideo('homepage-hero-2.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-3',
    src: homeVideo('homepage-hero-3.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-4',
    src: homeVideo('homepage-hero-4.mp4'),
    caption: 'Immersive Sales Demos crafted for your Business',
  },
  {
    id: 'hero-5',
    src: homeVideo('homepage-hero-5.mp4'),
    caption: 'Easily Track Usage & Drive Lead Generation',
  },
];

export const LAST_VIDEO_KEY = 'voyant-sales-demo.last-home-video';
