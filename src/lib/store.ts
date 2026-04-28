import type { NewsItem } from '@/lib/types';

const inMemorySubscribers = new Map<string, { phone: string; confirmed: boolean; code: string; categories: string }>();

export interface Subscriber {
  phone: string;
  confirmed: boolean;
  code: string;
  categories: string;
}

export function getSubscribers(): Subscriber[] {
  return Array.from(inMemorySubscribers.values()).filter(s => s.confirmed);
}

export function addSubscriber(phone: string, code: string, categories = 'ai,dev,hardware,business'): void {
  inMemorySubscribers.set(phone, { phone, confirmed: false, code, categories });
}

export function confirmSubscriber(phone: string, code: string): boolean {
  const sub = inMemorySubscribers.get(phone);
  if (!sub || sub.code !== code) return false;
  sub.confirmed = true;
  sub.code = '';
  return true;
}

export function getSubscriber(phone: string): Subscriber | undefined {
  return inMemorySubscribers.get(phone);
}

export function formatDigestMessage(items: NewsItem[], maxItems = 5, baseUrl = 'https://trellis.app'): string {
  const lines = ['📰 Trellis Daily Briefing'];
  
  items.slice(0, maxItems).forEach((item, index) => {
    const emoji = item.category === 'ai' ? '🤖' : item.category === 'dev' ? '💻' : item.category === 'hardware' ? '⚡' : '💰';
    const truncated = item.title.slice(0, 55);
    lines.push(`${index + 1}. ${emoji} ${truncated}${item.title.length > 55 ? '...' : ''}`);
  });
  
  lines.push('');
  lines.push(`View all: ${baseUrl}`);
  
  return lines.join('\n');
}