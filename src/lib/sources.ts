import type { Source } from './types';

export const RSS_SOURCES: Source[] = [
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/ai/feed/',
    category: 'ai',
    enabled: true,
  },
  {
    id: 'mit-ai',
    name: 'MIT News AI',
    url: 'https://news.mit.edu/rss/topic/artificialintelligence',
    category: 'ai',
    enabled: true,
  },
  {
    id: 'hn-frontpage',
    name: 'Hacker News',
    url: 'https://hnrss.org/frontpage',
    category: 'dev',
    enabled: true,
  },
  {
    id: 'devto',
    name: 'Dev.to',
    url: 'https://dev.to/feed',
    category: 'dev',
    enabled: true,
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'hardware',
    enabled: true,
  },
  {
    id: 'techcrunch-venture',
    name: 'TechCrunch Venture',
    url: 'https://techcrunch.com/category/venture/feed/',
    category: 'business',
    enabled: true,
  },
];

export const CATEGORIES = ['ai', 'dev', 'hardware', 'business'] as const;