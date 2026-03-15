import { dispatchWebhook } from './dispatcher';
import type { WebhookEvent } from './types';

const REQUEST_WEBHOOK_TIMEOUT_MS = 1500;
const REQUEST_WEBHOOK_MAX_RETRIES = 0;

export async function scheduleWebhookDispatch(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await dispatchWebhook(event, data, {
      timeoutMs: REQUEST_WEBHOOK_TIMEOUT_MS,
      maxRetries: REQUEST_WEBHOOK_MAX_RETRIES,
    });
  } catch (error) {
    console.error('Webhook dispatch failed:', error);
  }
}
