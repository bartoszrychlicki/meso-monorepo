import { notFound } from 'next/navigation';
import { SentryExampleClient } from './sentry-example-client';

export default function SentryExamplePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <SentryExampleClient />;
}
