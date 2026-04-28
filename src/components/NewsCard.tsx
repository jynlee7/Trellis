'use client';

import type { NewsItem, NewsCategory } from '@/lib/types';

interface NewsCardProps {
  item: NewsItem;
}

const categoryColors: Record<NewsCategory, string> = {
  ai: 'bg-purple-100 text-purple-800 border-purple-200',
  dev: 'bg-blue-100 text-blue-800 border-blue-200',
  hardware: 'bg-orange-100 text-orange-800 border-orange-200',
  business: 'bg-green-100 text-green-800 border-green-200',
};

export function NewsCard({ item }: NewsCardProps) {
  return (
    <article className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColors[item.category] || 'bg-gray-100 text-gray-800'}`}
            >
              {item.category.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{item.source}</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600"
            >
              {item.title}
            </a>
          </h3>
          {item.summary && (
            <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
          )}
          <time className="text-xs text-gray-400 mt-2 block">
            {new Date(item.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
      </div>
    </article>
  );
}