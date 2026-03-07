import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const error = new Error(`POS Sentry verification API ${new Date().toISOString()}`);
  const eventId = Sentry.captureException(error, {
    tags: {
      app: 'pos',
      verification: 'manual',
      verification_source: 'api',
    },
  });
  const flushed = await Sentry.flush(2000);

  return NextResponse.json({
    success: true,
    eventId,
    flushed,
  });
}
