'use client';

import { useState } from 'react';
import type { NewsCategory } from '@/lib/types';
import { CATEGORIES } from '@/lib/sources';

interface HeaderProps {
  onCategoryChange?: (categories: NewsCategory[]) => void;
}

export function Header({ onCategoryChange }: HeaderProps) {
  const [selectedCategories, setSelectedCategories] = useState<NewsCategory[]>([]);

  const toggleCategory = (category: NewsCategory) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
    onCategoryChange?.(newCategories);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trellis</h1>
            <p className="text-sm text-gray-500">Tech News Curator</p>
          </div>
          
          <nav className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}