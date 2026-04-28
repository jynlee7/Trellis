export type Source = {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
};

export type Article = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  sourceId: string;
  category: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  processed: boolean;
};

export type Digest = {
  id: string;
  date: string;
  title: string;
  content: string | null;
  articleCount: number;
};

export type UserPreferences = {
  id: string;
  notificationTime: string;
  categories: string;
  sources: string | null;
};

export type NewsCategory = 'ai' | 'dev' | 'hardware' | 'business';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: NewsCategory;
  publishedAt: string;
}