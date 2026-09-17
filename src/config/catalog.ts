import raw from '../../shared/demos.json';

export interface CatalogDemo {
  id: string;
  label: string;
  category: string;
  kind: 'exe' | 'url';
  path?: string;
  url?: string;
}

export interface CatalogCategory {
  id: string;
  label: string;
}

export const catalog = raw as {
  categories: CatalogCategory[];
  demos: CatalogDemo[];
};
