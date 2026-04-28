import { NextRequest, NextResponse } from 'next/server';
import { aggregateNews } from '@/lib/aggregator';
import { CATEGORIES } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get('category');
  const category = categoryParam ? categoryParam.split(',').filter(Boolean) : [];
  
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 100) : 50;
  
  const hoursStr = searchParams.get('hours');
  const hours = hoursStr ? Math.min(parseInt(hoursStr, 10), 72) : 24;

  const validCategories = category.filter((c) =>
    CATEGORIES.includes(c as typeof CATEGORIES[number])
  ) as typeof CATEGORIES[number][];

  try {
    const news = await aggregateNews({
      categories: validCategories.length ? validCategories : undefined,
      limit,
      hours,
    });

    return NextResponse.json({
      success: true,
      data: news,
      meta: {
        count: news.length,
        categories: validCategories.length ? validCategories : CATEGORIES,
        hours,
      },
    });
  } catch (error) {
    console.error('News aggregation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to aggregate news' },
      { status: 500 }
    );
  }
}