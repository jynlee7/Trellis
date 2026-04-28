import { CATEGORIES } from '@/lib/sources';
import { aggregateNews } from '@/lib/aggregator';
import type { NewsItem, NewsCategory } from '@/lib/types';
import Link from 'next/link';

export const revalidate = 900;

const categoryColors: Record<NewsCategory, string> = {
  ai: 'border-l-purple-500',
  dev: 'border-l-blue-500',
  hardware: 'border-l-orange-500',
  business: 'border-l-green-500',
};

const categoryTitles: Record<NewsCategory, string> = {
  ai: 'Artificial Intelligence',
  dev: 'Developer News',
  hardware: 'Hardware',
  business: 'Venture & Business',
};

export function generateMetadata() {
  return {
    title: 'Trellis - Tech News Curator',
    description: 'Daily tech news briefing covering AI, development, hardware, and business',
  };
}

async function getAllNews() {
  const news = await aggregateNews({ limit: 100, hours: 24 });
  return news;
}

function Header({ selectedCategory }: { selectedCategory?: string }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">Trellis</Link>
            <p className="text-sm text-gray-500">Tech News Curator</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <a
                  key={category}
                  href={selectedCategory === category ? '/' : `/?category=${category}`}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {category.toUpperCase()}
                </a>
              ))}
            </nav>
            <a
              href="/subscribe"
              className="px-3 py-1.5 text-sm rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Subscribe
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

interface CategorySectionProps {
  title: string;
  category: NewsCategory;
  items: NewsItem[];
  showSection: boolean;
}

function CategorySection({ title, category, items, showSection }: CategorySectionProps) {
  if (!items.length) return null;
  
  const colorClass = categoryColors[category];
  
  return (
    <section className="mb-10">
      {showSection && (
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${categoryColors[category]}`} />
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <span className="text-sm text-gray-500">({items.length})</span>
        </div>
      )}
      <div className="space-y-3">
        {items.slice(0, showSection ? 6 : 20).map((item) => (
          <NewsCard key={item.id} item={item} categoryColor={colorClass} />
        ))}
      </div>
    </section>
  );
}

interface NewsCardProps {
  item: NewsItem;
  categoryColor: string;
}

function NewsCard({ item, categoryColor }: NewsCardProps) {
  return (
    <article className={`border-l-4 ${categoryColor} bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
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
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.summary}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{item.source}</span>
            <span>•</span>
            <time>
              {new Date(item.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params.category;
  
  const allNews = await getAllNews();
  
  let filteredNews = allNews;
  if (selectedCategory && CATEGORIES.includes(selectedCategory as NewsCategory)) {
    filteredNews = allNews.filter((n) => n.category === selectedCategory);
  }

  const grouped = {
    ai: filteredNews.filter((n) => n.category === 'ai'),
    dev: filteredNews.filter((n) => n.category === 'dev'),
    hardware: filteredNews.filter((n) => n.category === 'hardware'),
    business: filteredNews.filter((n) => n.category === 'business'),
  };

  const categories = selectedCategory 
    ? ([selectedCategory] as NewsCategory[])
    : (['ai', 'dev', 'hardware', 'business'] as NewsCategory[]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header selectedCategory={selectedCategory} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedCategory 
              ? `${categoryTitles[selectedCategory as NewsCategory]} News`
              : 'Daily Briefing'}
          </h2>
          <p className="text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="mb-6 text-sm text-gray-500">
          {selectedCategory 
            ? `Showing ${filteredNews.length} articles`
            : `Showing ${allNews.length} articles from the last 24 hours`}
        </div>

        {filteredNews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No news available at the moment.</p>
            <p className="text-sm text-gray-400 mt-2">Check back later for updates.</p>
          </div>
        ) : (
          categories.map((cat) => {
            const items = grouped[cat as NewsCategory];
            if (!items.length) return null;
            
            return (
              <CategorySection
                key={cat}
                title={categoryTitles[cat as NewsCategory]}
                category={cat as NewsCategory}
                items={items}
                showSection={!selectedCategory}
              />
            );
          })
        )}
      </main>
    </div>
  );
}