import { after } from 'next/server';
import { dispatchWebhook } from './dispatcher';
import type { WebhookEvent } from './types';

export function scheduleWebhookDispatch(
  event: WebhookEvent,
  data: Record<string, unknown>
): void {
  const run = async () => {
    try {
      await dispatchWebhook(event, data);
    } catch (error) {
      console.error('Webhook dispatch failed:', error);
    }
  };

  try {
    after(run);
  } catch {
    // Fallback for tests and environments without an active request context.
    void run();
  }
}
