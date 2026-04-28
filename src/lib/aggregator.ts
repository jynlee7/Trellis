import { fetchAndParseFeed, normalizeToArticle, type ParsedFeed } from './fetcher';
import { RSS_SOURCES } from './sources';
import type { Article, NewsCategory, NewsItem } from './types';
import { v4 as uuidv4 } from 'uuid';

const SOURCE_WEIGHTS: Record<string, number> = {
  'techcrunch-ai': 10,
  'techcrunch-venture': 10,
  'mit-ai': 9,
  'hn-frontpage': 8,
  'devto': 7,
  'the-verge': 6,
};

type FetchResult = {
  source: typeof RSS_SOURCES[number];
  feed: ParsedFeed;
  error?: string;
};

async function fetchAllFeeds(): Promise<FetchResult[]> {
  const enabledSources = RSS_SOURCES.filter((s) => s.enabled);
  const results = await Promise.allSettled(
    enabledSources.map(async (source) => {
      const feed = await fetchAndParseFeed(source.url, source.category as NewsCategory);
      return { source, feed };
    })
  );

  return results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        source: enabledSources[index],
        feed: { title: '', items: [], category: enabledSources[index].category as NewsCategory },
        error: result.reason?.message || 'Unknown error',
      };
    })
    .filter((r): r is FetchResult => r !== undefined);
}

function deduplicate(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const fingerprint = article.title.toLowerCase().slice(0, 50);
    if (seen.has(fingerprint)) {
      return false;
    }
    seen.add(fingerprint);
    return true;
  });
}

function rankArticles(articles: Article[]): Article[] {
  return articles.sort((a, b) => {
    const weightA = SOURCE_WEIGHTS[a.sourceId] || 5;
    const weightB = SOURCE_WEIGHTS[b.sourceId] || 5;
    const scoreA = weightA * 1000000 + (a.publishedAt?.getTime() || 0);
    const scoreB = weightB * 1000000 + (b.publishedAt?.getTime() || 0);
    return scoreB - scoreA;
  });
}

function filterByCategory(
  articles: Article[],
  categories: NewsCategory[]
): Article[] {
  if (!categories.length) return articles;
  return articles.filter((a) => categories.includes(a.category as NewsCategory));
}

function filterByDateRange(
  articles: Article[],
  startDate: Date,
  endDate: Date
): Article[] {
  return articles.filter((a) => {
    if (!a.publishedAt) return true;
    return a.publishedAt >= startDate && a.publishedAt <= endDate;
  });
}

export async function aggregateNews(options?: {
  categories?: NewsCategory[];
  limit?: number;
  hours?: number;
}): Promise<NewsItem[]> {
  const { categories = [], limit = 50, hours = 24 } = options || {};

  const results = await fetchAllFeeds();

  const now = new Date();
  const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

  let articles: Article[] = [];

  for (const result of results) {
    if (result.error) continue;

    for (const item of result.feed.items) {
      const article = normalizeToArticle(
        item,
        result.source.id,
        result.feed.category
      );
      articles.push(article as Article);
    }
  }

  articles = deduplicate(articles);
  articles = filterByDateRange(articles, startDate, now);

  if (categories.length) {
    articles = filterByCategory(articles, categories);
  }

  articles = rankArticles(articles).slice(0, limit);

  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary || '',
    url: a.url,
    source: RSS_SOURCES.find((s) => s.id === a.sourceId)?.name || 'Unknown',
    category: a.category as NewsCategory,
    publishedAt: a.publishedAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function generateDailyDigest(options?: {
  categories?: NewsCategory[];
}): Promise<{ id: string; date: string; items: NewsItem[] }> {
  const { categories = ['ai', 'dev', 'hardware', 'business'] } = options || {};

  const items = await aggregateNews({
    categories: categories as NewsCategory[],
    limit: 30,
    hours: 24,
  });

  const today = new Date().toISOString().split('T')[0];

  return {
    id: uuidv4(),
    date: today,
    items,
  };
}