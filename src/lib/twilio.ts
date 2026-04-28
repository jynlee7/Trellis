import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export function isTwilioConfigured(): boolean {
  return !!(client && phoneNumber);
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    console.log('Twilio not configured. SMS would be sent to:', to, 'Message:', body);
    return { success: false, error: 'Twilio not configured' };
  }

  if (!phoneNumber) {
    console.log('Twilio phone number not verified yet. Message would be:', to, body);
    return { success: false, error: 'Phone number not verified - complete Twilio toll-free verification' };
  }

  try {
    await client.messages.create({
      body,
      from: phoneNumber,
      to,
    });
    return { success: true };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function formatDigestForSMS(items: { title: string; category: string; url: string }[], maxItems = 5, baseUrl = ''): string {
  const lines = ['📰 Trellis Daily Briefing'];
  
  items.slice(0, maxItems).forEach((item, index) => {
    const emoji = item.category === 'ai' ? '🤖' : item.category === 'dev' ? '💻' : item.category === 'hardware' ? '⚡' : '💰';
    lines.push(`${index + 1}. ${emoji} ${item.title.slice(0, 55)}${item.title.length > 55 ? '...' : ''}`);
  });
  
  if (baseUrl) {
    lines.push('');
    lines.push(`View all: ${baseUrl}`);
  }
  
  return lines.join('\n');
}