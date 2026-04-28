import { NextRequest, NextResponse } from 'next/server';
import { generateDailyDigest } from '@/lib/aggregator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const digest = await generateDailyDigest({
      categories: ['ai', 'dev', 'hardware', 'business'],
    });

    console.log(`Generated digest for ${digest.date} with ${digest.items.length} articles`);

    return NextResponse.json({
      success: true,
      data: {
        id: digest.id,
        date: digest.date,
        articleCount: digest.items.length,
      },
    });
  } catch (error) {
    console.error('Cron digest error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate digest' },
      { status: 500 }
    );
  }
}