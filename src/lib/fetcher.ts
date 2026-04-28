import { XMLParser } from 'fast-xml-parser';
import type { Article, NewsCategory } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const CACHE_TTL = 15 * 60 * 1000;

const cache: Map<string, { data: ParsedFeed; timestamp: number }> = new Map();

export interface ParsedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
}

export interface ParsedFeed {
  title: string;
  items: ParsedItem[];
  category: NewsCategory;
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TechNewsCurator/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) {
      throw new Error('Feed exceeds 2MB limit');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRSS(xml: string, category: NewsCategory): ParsedFeed {
  const parsed = parser.parse(xml);
  const channel = parsed.rss?.channel;

  if (!channel) {
    return { title: 'Unknown', items: [], category };
  }

  const items = Array.isArray(channel.item)
    ? channel.item
    : channel.item
    ? [channel.item]
    : [];

  return {
    title: channel.title || 'Unknown',
    items: items.map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const titleVal = i.title;
      const descVal = i.description;
      const guidVal = i.guid;
      return {
        title: typeof titleVal === 'object' && titleVal ? (titleVal as { '#text': string })['#text'] : (titleVal as string) || '',
        link: (i.link as string) || '',
        description: typeof descVal === 'object' && descVal ? (descVal as { '#text': string })['#text'] : (descVal as string) || '',
        pubDate: (i.pubDate as string) || (i['dc:date'] as string) || '',
        guid: typeof guidVal === 'object' && guidVal ? (guidVal as { '#text': string })['#text'] : (guidVal as string) || (i.link as string) || '',
      };
    }),
    category,
  };
}

function parseAtom(xml: string, category: NewsCategory): ParsedFeed {
  const parsed = parser.parse(xml);
  const feed = parsed.feed;

  if (!feed) {
    return { title: 'Unknown', items: [], category };
  }

  const entries = Array.isArray(feed.entry)
    ? feed.entry
    : feed.entry
    ? [feed.entry]
    : [];

  const feedTitle = feed.title;
  return {
    title: typeof feedTitle === 'object' && feedTitle ? (feedTitle as { '#text': string })['#text'] : (feedTitle as string) || 'Unknown',
    items: entries.map((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const titleVal = e.title;
      const linkVal = e.link;
      const summaryVal = e.summary;
      return {
        title: typeof titleVal === 'object' && titleVal ? (titleVal as { '#text': string })['#text'] : (titleVal as string) || '',
        link: Array.isArray(linkVal) ? (linkVal[0] as { '@_href': string })?.['@_href'] : (linkVal as { '@_href': string })?.['@_href'] || '',
        description: typeof summaryVal === 'object' && summaryVal ? (summaryVal as { '#text': string })['#text'] : (summaryVal as string) || (e.content as string) || '',
        pubDate: (e.published as string) || (e.updated as string) || '',
        guid: (e.id as string) || '',
      };
    }),
    category,
  };
}

export async function fetchAndParseFeed(
  url: string,
  category: NewsCategory
): Promise<ParsedFeed> {
  const cached = cache.get(url);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const xml = await fetchFeed(url);
  let feed: ParsedFeed;

  if (xml.includes('<rss')) {
    feed = parseRSS(xml, category);
  } else if (xml.includes('<feed')) {
    feed = parseAtom(xml, category);
  } else {
    feed = parseRSS(xml, category);
  }

  cache.set(url, { data: feed, timestamp: now });
  return feed;
}

export function normalizeToArticle(
  item: ParsedItem,
  sourceId: string,
  category: NewsCategory
): Omit<Article, 'fetchedAt' | 'processed'> {
  const id = generateHash(item.guid || item.link);
  const summary = stripHtml(item.description);

  return {
    id,
    title: item.title,
    summary,
    content: null,
    url: item.link,
    sourceId,
    category,
    publishedAt: parseDate(item.pubDate),
  };
}

function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export function clearCache() {
  cache.clear();
}