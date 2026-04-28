'use client';

import { NewsCard } from './NewsCard';
import type { NewsItem, NewsCategory } from '@/lib/types';

interface CategorySectionProps {
  title: string;
  category: NewsCategory;
  items: NewsItem[];
}

const categoryIcons: Record<NewsCategory, string> = {
  ai: '🤖',
  dev: '💻',
  hardware: '⚡',
  business: '💰',
};

export function CategorySection({ title, category, items }: CategorySectionProps) {
  if (!items.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{categoryIcons[category]}</span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-500">({items.length})</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.slice(0, 6).map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}