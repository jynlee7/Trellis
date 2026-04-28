import { NextRequest, NextResponse } from 'next/server';
import { generateDailyDigest } from '@/lib/aggregator';
import { CATEGORIES } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoriesParam = searchParams.get('categories');
  const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) as string[] : null;

  const validCategories = (categories || CATEGORIES).filter((c) =>
    CATEGORIES.includes(c as typeof CATEGORIES[number])
  ) as typeof CATEGORIES[number][];

  try {
    const digest = await generateDailyDigest({
      categories: validCategories,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: digest.id,
        date: digest.date,
        articleCount: digest.items.length,
        articles: digest.items,
      },
    });
  } catch (error) {
    console.error('Digest generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate digest' },
      { status: 500 }
    );
  }
}