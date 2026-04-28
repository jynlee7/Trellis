import { NextRequest, NextResponse } from 'next/server';
import { aggregateNews } from '@/lib/aggregator';
import { getSubscribers, formatDigestMessage } from '@/lib/store';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const news = await aggregateNews({ limit: 20, hours: 24 });
    
    if (news.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No news to send',
      });
    }

    const subscribers = getSubscribers();
    
    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No subscribers to send to',
      });
    }

    const message = formatDigestMessage(news, 5);
    let sentCount = 0;
    let failCount = 0;

    for (const subscriber of subscribers) {
      const result = await sendSMS(subscriber.phone, message);
      if (result.success) {
        sentCount++;
      } else {
        failCount++;
        console.error('Failed to send to', subscriber.phone, result.error);
      }
    }

    console.log(`Digest sent: ${sentCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      data: {
        articleCount: news.length,
        subscriberCount: subscribers.length,
        sentCount,
        failCount,
      },
    });
  } catch (error) {
    console.error('Digest cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send digest' },
      { status: 500 }
    );
  }
}