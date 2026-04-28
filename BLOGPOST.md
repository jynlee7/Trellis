# Building Trellis: My Tech News Curator Journey

## The Problem

Every day, I spend too much time scanning multiple tech news sources—TechCrunch, Hacker News, The Verge, MIT News—just to stay informed. Each has its own feed, its own format, its own rhythm. The signal-to-noise ratio is terrible, and minor stories clutter my reading list.

I wanted something different: a curated, daily briefing that delivers only the most important tech news, organized by category, with zero fluff.

This is the story of how I built **Trellis**—from idea to production.

---

## Chapter 1: The Research Phase

### What Already Exists?

Before writing a single line of code, I researched existing solutions. Here's what I found:

**RSS Aggregators**
- `sen-ltd/rss-aggregator` — Minimal Hono-based aggregator with dedup and caching
- `wichaisw/news-crawler` — Next.js 15 + n8n orchestrator
- `GTuritto/RSS-MCPserver` — MCP-first approach with REST fallback

**Tech News Apps**
- `sho7650/tech-news-curator` — Python FastAPI + Next.js frontend (most similar to my vision)
- `lisan-5/News-API` — Node.js with sentiment analysis (over-engineered for my needs)

### Key Insights

1. **Most solutions are either too simple** (just a feed merger) **or too complex** (full NLP, sentiment analysis, vector search)
2. **No existing solution matched my exact workflow**: daily brief, category-filtered, ranked by importance
3. **Free RSS feeds are abundant**—no paid APIs needed for initial version
4. **Next.js App Router is the standard**—every modern solution uses it

### The Decision: Build vs. Adapt

I could have forked one of these projects, but none matched my:
- Daily briefing format (8 AM delivery)
- Category filtering (AI, Dev, Hardware, Business)
- Ranking by source weight + recency
- Minimal, crisp UI with no clutter

**Verdict**: Build from scratch with modern tools.

---

## Chapter 2: Architecture Decisions

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|----------|
| Framework | Next.js 16 | App Router, Server Components, ISR built-in |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS 4 | Fast iteration, responsive |
| Database | PostgreSQL | Persistent storage for future (via Vercel) |
| ORM | Drizzle | Lightweight, TypeScript-first, no runtime overhead |
| RSS Parsing | fast-xml-parser | Battle-tested, supports RSS & Atom |
| Validation | Zod | Schema validation for API responses |
| Scheduling | node-cron | Cron jobs for daily digest |

### Data Sources (All Free RSS)

| Source | Category | Feed URL |
|--------|----------|---------|
| TechCrunch AI | AI | `techcrunch.com/category/ai/feed/` |
| MIT News (AI) | AI | `news.mit.edu/rss/topic/artificialintelligence` |
| Hacker News | Dev | `hnrss.org/frontpage` |
| Dev.to | Dev | `dev.to/feed` |
| The Verge | Hardware | `theverge.com/rss/index.xml` |
| TechCrunch Venture | Business | `techcrunch.com/category/venture/feed/` |

**Note**: These are all free, public RSS feeds. No API keys needed.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 Web App                       │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │  API Routes  │    │  Cron Job   │  │
│  │  (Server     │◄───│ /api/news   │    │ /api/cron   │  │
│  │   Components)│    │ /api/digest │    │ (manual)    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│         │                    │                      │          │
│         └────────────────┬──┴──────────────────┘          │
│                          │                                 │
│                   ┌──────▼──────┐                         │
│                   │ Aggregator  │                         │
│                   │ + Fetcher   │                         │
│                   │ + Parser    │                         │
│                   └──────┬──────┘                         │
│                          │                                 │
│                    RSS Feeds                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Chapter 3: Implementation Journey

### Phase 1: Project Setup

```bash
# Initialize Next.js 16 with TypeScript and Tailwind
npx create-next-app@latest trellis --typescript --tailwind --eslint --app --src-dir

# Install dependencies
npm install drizzle-orm postgres zod date-fns fast-xml-parser node-cron uuid
npm install -D drizzle-kit @types/node @types/uuid
```

### Phase 2: Database Schema

I chose not to use the database immediately (in-memory cache for v1), but I designed the schema for future PostgreSQL integration:

```typescript
// src/lib/db/schema.ts
export const sources = pgTable('sources', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  enabled: boolean('enabled').default(true),
});

export const articles = pgTable('articles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  url: varchar('url', { length: 1000 }).notNull(),
  sourceId: varchar('source_id').references(() => sources.id),
  category: varchar('category', { length: 50 }).notNull(),
  publishedAt: timestamp('published_at'),
  fetchedAt: timestamp('fetched_at').defaultNow(),
  processed: boolean('processed').default(false),
});
```

**Why in-memory-first?** It lets me ship faster. PostgreSQL adds DevOps overhead (/migrations, connection pooling, Vercel storage billing). I can add it later via `drizzle-kit push`.

### Phase 3: RSS Fetcher & Parser

The core of the system. Key decisions:

**1. Caching Strategy**
- 15-minute TTL cache per feed
- In-memory (Map) for simplicity
- Graceful partial failures (one feed down doesn't break the app)

**2. Parsing Approach**
- Support both RSS 2.0 and Atom formats
- Use `fast-xml-parser` (fast, handles malformed XML)
- Normalize to unified schema

```typescript
// src/lib/fetcher.ts
export async function fetchAndParseFeed(
  url: string,
  category: NewsCategory
): Promise<ParsedFeed> {
  const cached = cache.get(url);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  // Fetch, parse, cache, return
}
```

**3. Content Cleaning**
- Strip HTML tags from descriptions
- Handle common entities (`&nbsp;`, `&amp;`, etc.)
- Truncate summaries at reasonable length

### Phase 4: Aggregation Logic

This is where the "curation" happens:

```typescript
// src/lib/aggregator.ts
export async function aggregateNews(options?: {
  categories?: NewsCategory[];
  limit?: number;
  hours?: number;
}): Promise<NewsItem[]> {
  // 1. Fetch all feeds concurrently
  // 2. Normalize to articles
  // 3. Deduplicate (by title hash)
  // 4. Rank by source weight + recency
  // 5. Filter by category and date range
  // 6. Return top N
}
```

**Ranking Algorithm**
I use a weighted scoring system:
```typescript
const SOURCE_WEIGHTS: Record<string, number> = {
  'techcrunch-ai': 10,    // High authority
  'mit-ai': 9,            // Academic trust
  'hn-frontpage': 8,       // Community-driven
  'devto': 7,            // Developer-focused
  'the-verge': 6,         // General tech
  'techcrunch-venture': 10, // Business authority
};

function rankArticles(articles: Article[]): Article[] {
  return articles.sort((a, b) => {
    const scoreA = SOURCE_WEIGHTS[a.sourceId] * 1000000 + (a.publishedAt?.getTime() || 0);
    const scoreB = SOURCE_WEIGHTS[b.sourceId] * 1000000 + (b.publishedAt?.getTime() || 0);
    return scoreB - scoreA;
  });
}
```

### Phase 5: API Routes

Using Next.js App Router's route handlers:

```typescript
// src/app/api/news/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category')?.split(',');
  const limit = parseInt(searchParams.get('limit') || '50');
  const hours = parseInt(searchParams.get('hours') || '24');

  const news = await aggregateNews({ categories, limit, hours });

  return NextResponse.json({
    success: true,
    data: news,
    meta: { count: news.length, categories, hours },
  });
}
```

**Key design decisions:**
- `force-dynamic` for real-time data (no static caching at edge)
- Query parameters for filtering (not required body)
- Consistent response envelope: `{ success, data, meta }`

### Phase 6: Frontend

Server Components for the win:

```typescript
// src/app/page.tsx
export default async function HomePage() {
  const allNews = await aggregateNews({ limit: 100, hours: 24 });
  const aiNews = allNews.filter((n) => n.category === 'ai');
  const devNews = allNews.filter((n) => n.category === 'dev');
  // ...

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <CategorySection title="Artificial Intelligence" category="ai" items={aiNews} />
        <CategorySection title="Developer News" category="dev" items={devNews} />
        {/* ... */}
      </main>
    </div>
  );
}
```

**Why Server Components?**
- Data fetched on the server—no waterfall requests
- No client-side loading states needed
- SEO-friendly by default
- ISR (Incremental Static Regeneration) for performance: `export const revalidate = 900`

### Phase 7: Daily Digest Cron

For Vercel's cron feature:

```typescript
// src/app/api/cron/digest/route.ts
export async function POST(request: NextRequest) {
  // Verify CRON_SECRET for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const digest = await generateDailyDigest({
    categories: ['ai', 'dev', 'hardware', 'business'],
  });

  console.log(`Generated digest for ${digest.date} with ${digest.items.length} articles`);
  return NextResponse.json({ success: true, data: digest });
}
```

**Cron Schedule** (configured in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

## Chapter 4: Key Design Trade-offs

### What I Chose (And Why)

| Decision | Alternative | Why |
|----------|-------------|-----|
| In-memory cache | PostgreSQL from day 1 | Ship faster, add DB later when needed |
| RSS feeds | Paid news APIs | Free, abundant, no rate limits |
| Server Components | Client-side + React Query | Simpler, SSR, SEO |
| Category filtering | Full-text search | Matches exact user need |
| Source weighting | Algorithmic ranking | Proven sources > ML scores |

### What I'd Do Differently

1. **Add PostgreSQL sooner**—Vercel Storage makes it almost free now
2. **User authentication**—for personalized briefings
3. **Email delivery**—as an alternative to web
4. **Email digest**—via Resend or Mailgun

---

## Chapter 5: Lessons Learned

### 1. RSS is Not Dead

Everyone says RSS is dead, but it's arguably the most reliable data source for news aggregation. No API keys, no rate limits, no shutdown risk.

### 2. Server Components Change Everything

I initially thought I'd need React Query for client-side data fetching. Then I realized Next.js Server Components handle it all—no JavaScript sent to the client, no loading spinners needed.

### 3. Curation > Aggregation

The hardest part is not fetching—it's ranking. A simple weighted scoring system (source authority + recency) outperforms complex ML approaches for this use case.

### 4. Ship,Then Scale

I started with in-memory caching and no database. PostgreSQL can wait. The MVP works, and I can add complexity as needed.

---

## Chapter 6: Future Roadmap

### v1.1 (Immediate)
- [ ] Add PostgreSQL via Vercel Storage
- [ ] User preferences (category filtering)
- [ ] Email digest via Resend

### v1.2 (Short-term)
- [ ] User authentication (Clerk)
- [ ] Mobile-native app (PWA)
- [ ] Push notifications

### v1.3 (Mid-term)
- [ ] AIsummarization of articles
- [ ] "Save for later" feature
- [ ] Share via email

---

## Conclusion

Trellis is my answer to the tech news overload problem. It's not the most sophisticated news aggregator—it's the simplest one that works.

The key insight: **curation beats aggregation**. The hard part isn't fetching feeds—it's deciding what matters.

I hope this journey inspires you to build your own tools. The best software solves your own problems first.

---

*Built with Next.js 16, TypeScript, Tailwind CSS 4, and free RSS feeds.*

*Deployed on Vercel.*