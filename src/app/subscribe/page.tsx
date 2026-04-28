'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SubscribePage() {
  const [phone, setPhone] = useState('');
  const [sessionPhone, setSessionPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [view, setView] = useState<'subscribe' | 'confirm'>('subscribe');
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('trellis_phone', phone);
        }
        setSessionPhone(phone);
        setView('confirm');
        setStatus('idle');
      } else {
        setError(data.error || 'Failed to subscribe');
        setStatus('error');
      }
    } catch {
      setError('Something went wrong');
      setStatus('error');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    const currentPhone = sessionPhone || phone;

    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentPhone, code }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('trellis_phone');
        }
      } else {
        setError(data.error || 'Invalid code');
        setStatus('error');
      }
    } catch {
      setError('Something went wrong');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h1>
          <p className="text-gray-600 mb-6">
            You&apos;ll receive daily tech news briefs on your phone at 8 AM.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {view === 'subscribe' ? 'Subscribe to Trellis' : 'Confirm Your Phone'}
        </h1>
        <p className="text-gray-600 mb-6">
          {view === 'subscribe' 
            ? 'Get daily tech news briefs sent to your phone every morning.'
            : 'Enter the 6-digit code sent to your phone.'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={view === 'subscribe' ? handleSubmit : handleConfirm}>
          {view === 'subscribe' ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                required
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmation Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-center text-2xl tracking-widest"
                required
              />
              <input type="hidden" value={sessionPhone} />
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? 'Sending...' : view === 'subscribe' ? 'Send Code' : 'Confirm'}
          </button>
        </form>

        {view === 'confirm' && (
          <button
            onClick={() => {
              setView('subscribe');
              if (typeof window !== 'undefined') {
                localStorage.removeItem('trellis_phone');
              }
            }}
            className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700"
          >
            Wrong number? Start over
          </button>
        )}
      </div>
    </div>
  );
}