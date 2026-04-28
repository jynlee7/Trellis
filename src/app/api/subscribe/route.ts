import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio';
import { addSubscriber, getSubscriber } from '@/lib/store';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString().slice(0, 6);
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, categories = 'ai,dev,hardware,business' } = body;

  if (!phone || !validatePhone(phone)) {
    return NextResponse.json(
      { success: false, error: 'Invalid phone number' },
      { status: 400 }
    );
  }

  const cleanedPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanedPhone.length === 10 ? `+1${cleanedPhone}` : `+${cleanedPhone}`;
  
  const existing = getSubscriber(formattedPhone);
  if (existing?.confirmed) {
    return NextResponse.json(
      { success: false, error: 'Phone already subscribed' },
      { status: 400 }
    );
  }

  const code = generateCode();
  addSubscriber(formattedPhone, code, categories);

  const result = await sendSMS(
    formattedPhone,
    `Trellis: Your verification code is ${code}. Enter this code to confirm your subscription.`
  );

  console.log('Subscribe: code sent to', formattedPhone, result);

  return NextResponse.json({
    success: true,
    message: 'Check your phone for confirmation code',
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to subscribe',
  });
}