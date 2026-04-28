import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio';

const subscribers = new Map<string, { phone: string; confirmed: boolean; code: string }>();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, code } = body;

  if (!phone || !code) {
    return NextResponse.json(
      { success: false, error: 'Phone and code required' },
      { status: 400 }
    );
  }

  const cleanedPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanedPhone.length === 10 ? `+1${cleanedPhone}` : `+${cleanedPhone}`;

  const subscriber = subscribers.get(formattedPhone);
  if (!subscriber) {
    return NextResponse.json(
      { success: false, error: 'Subscriber not found' },
      { status: 404 }
    );
  }

  if (subscriber.code !== code) {
    return NextResponse.json(
      { success: false, error: 'Invalid code' },
      { status: 400 }
    );
  }

  subscriber.confirmed = true;
  subscriber.code = '';

  await sendSMS(
    formattedPhone,
    'Trellis: You are now subscribed to daily tech news briefs!'
  );

  return NextResponse.json({
    success: true,
    message: 'Subscription confirmed!',
  });
}