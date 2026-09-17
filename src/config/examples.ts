import { localMedia } from './site';

export const EXAMPLE_TABS = [
  { id: 'tours', label: '3D Solution Tours' },
  { id: 'case-studies', label: 'Case Studies' },
  { id: 'assessments', label: 'Maturity Assessments & Value Calculators' },
  { id: 'vr', label: 'Virtual Reality' },
] as const;

export interface ExampleCard {
  id: string;
  tab: (typeof EXAMPLE_TABS)[number]['id'];
  page: number;
  brand: string;
  industry: string;
  image: string;
}

const guide = (file: string) => localMedia(`/images/build-guide/${file}`);

export const EXAMPLE_CARDS: ExampleCard[] = [
  { id: 'swi-explorer', tab: 'tours', page: 0, brand: 'Systems with Intelligence', industry: 'Power System', image: guide('image20.png') },
  { id: 'portfolio-navigator', tab: 'tours', page: 0, brand: 'Westinghouse', industry: 'Nuclear', image: guide('image28.png') },
  { id: 'critical-power', tab: 'tours', page: 0, brand: 'RESA Power', industry: 'Power System', image: guide('image30.png') },
  { id: 'emerson-chemical', tab: 'tours', page: 0, brand: 'Emerson', industry: 'Petrochemical', image: guide('image19.png') },
  { id: 'southern-states', tab: 'tours', page: 0, brand: 'Southern States', industry: 'Power Utility', image: guide('image17.png') },
  { id: 'dgs-networking', tab: 'tours', page: 0, brand: 'DGS', industry: 'Industrial Comms', image: guide('image18.png') },
  { id: 'utilities-solutions', tab: 'tours', page: 1, brand: 'Eaton', industry: 'Automation', image: guide('image35.png') },
  { id: 'kassel', tab: 'tours', page: 1, brand: 'GE', industry: 'Power', image: guide('image32.png') },
  { id: 'onshore-wind', tab: 'tours', page: 1, brand: 'GE', industry: 'Power', image: guide('image38.png') },
  { id: 'ge-additive', tab: 'tours', page: 1, brand: 'GE', industry: 'Additive Manufacturing', image: guide('image36.jpeg') },
  { id: 'healthcare-analytics', tab: 'tours', page: 1, brand: 'GE', industry: 'Healthcare Digital', image: guide('image39.png') },
  { id: 'gsixtream', tab: 'tours', page: 1, brand: 'GE', industry: 'Healthcare', image: guide('image37.png') },
  { id: 'emerson-mining', tab: 'case-studies', page: 0, brand: 'Emerson', industry: 'Mining', image: guide('image41.png') },
  { id: 'ap1000', tab: 'case-studies', page: 0, brand: 'Westinghouse', industry: 'Nuclear', image: guide('image42.png') },
  { id: 'emerson-sd', tab: 'case-studies', page: 0, brand: 'Emerson', industry: 'Sustainability', image: guide('image40.png') },
  { id: 'emerson-lng', tab: 'case-studies', page: 0, brand: 'Emerson', industry: 'Energy', image: guide('image43.png') },
  { id: 'fibro-explorer', tab: 'assessments', page: 0, brand: 'Cytiva', industry: 'Life Sciences', image: guide('image46.png') },
  { id: 'biosave-calc', tab: 'assessments', page: 0, brand: 'Cytiva', industry: 'Life Sciences', image: guide('image48.png') },
  { id: 'cytiva-figurate', tab: 'assessments', page: 0, brand: 'Cytiva', industry: 'Life Sciences', image: guide('image49.png') },
  { id: 'greengas', tab: 'assessments', page: 0, brand: 'GE', industry: 'Power', image: guide('image50.png') },
  { id: 'reservoir', tab: 'assessments', page: 0, brand: 'GE', industry: 'Power', image: guide('image47.png') },
  { id: 'statcom', tab: 'assessments', page: 0, brand: 'GE', industry: 'Power', image: guide('image51.png') },
  { id: 'vr-grid-mod', tab: 'vr', page: 0, brand: 'GE', industry: 'Grid Systems', image: guide('image55.png') },
  { id: 'vr-underground', tab: 'vr', page: 0, brand: 'GE', industry: 'Distribution', image: guide('image54.png') },
  { id: 'vr-dead-tank', tab: 'vr', page: 0, brand: 'GE', industry: 'Circuit Breakers', image: guide('image52.png') },
  { id: 'vr-hvdc', tab: 'vr', page: 0, brand: 'GE', industry: 'HVDC', image: guide('image53.png') },
];
