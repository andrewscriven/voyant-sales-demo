import { ANALYTICS_DEMO } from './site';

export interface TocItem {
  path?: string;
  href?: string;
  label: string;
  action?: 'exit';
  children?: TocItem[];
}

export const TOC_ITEMS: TocItem[] = [
  { path: '/', label: 'Home' },
  {
    path: '/platform',
    label: 'Immersive Selling Platform',
    children: [
      { path: '/storytelling', label: 'Value Based Storytelling' },
      { path: '/experiences', label: 'Immersive Experiences' },
      { path: '/examples', label: 'Immersive Experience Examples' },
      { path: '/user-management', label: 'User Management' },
      { path: '/analytics', label: 'Analytics & lead Gen.' },
      { href: ANALYTICS_DEMO, label: 'Analytics Demo' },
    ],
  },
  { path: '/offerings', label: 'Our Offerings' },
  { path: '/exit', label: 'Exit', action: 'exit' },
];

export const PLATFORM_PATH = '/platform';
export const OFFERINGS_PATH = '/offerings';

export function getSeriesFooter(pathname: string): { path: string; label: string }[] {
  const children = TOC_ITEMS.find((item) => item.path === PLATFORM_PATH)?.children ?? [];
  const index = children.findIndex((item) => item.path === pathname);

  if (index >= 0) {
    const next = children.slice(index + 1).find((item) => item.path);
    return [
      next
        ? { path: next.path!, label: next.path === '/examples' ? 'View Examples' : next.label }
        : { path: PLATFORM_PATH, label: 'Immersive Selling Platform' },
      { path: OFFERINGS_PATH, label: 'Our Offerings' },
    ];
  }

  if (pathname === OFFERINGS_PATH) {
    return [{ path: PLATFORM_PATH, label: 'Immersive Selling Platform' }];
  }

  return [];
}
