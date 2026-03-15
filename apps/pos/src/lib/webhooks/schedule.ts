import { dispatchWebhook } from './dispatcher';
import type { WebhookEvent } from './types';

export async function scheduleWebhookDispatch(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await dispatchWebhook(event, data);
  } catch (error) {
    console.error('Webhook dispatch failed:', error);
  }
}
