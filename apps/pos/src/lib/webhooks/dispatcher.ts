import {
  WebhookPayload,
  WebhookEvent,
  WebhookDeliveryResult,
} from './types';
import { webhookRegistry } from './registry';

const DEFAULT_WEBHOOK_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 2;

export type DispatchWebhookOptions = {
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * Sign a webhook payload with HMAC-SHA256
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Send a single webhook to a specific URL with retry
 */
async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string,
  options: DispatchWebhookOptions = {}
): Promise<WebhookDeliveryResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_WEBHOOK_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const body = JSON.stringify(payload);
  const signature = await signPayload(body, secret);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-POS-Signature': signature,
          'X-POS-Event': payload.event,
          'X-POS-Delivery-Id': payload.id,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return {
          success: true,
          status_code: response.status,
          delivery_id: payload.id,
        };
      }

      // Non-retryable status codes
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          status_code: response.status,
          error: `Client error: ${response.status}`,
          delivery_id: payload.id,
        };
      }
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          delivery_id: payload.id,
        };
      }
      // Wait before retry (exponential backoff: 1s, 2s)
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (attempt + 1))
      );
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
    delivery_id: payload.id,
  };
}

/**
 * Dispatch a webhook event to all registered subscribers
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>,
  options: DispatchWebhookOptions = {}
): Promise<WebhookDeliveryResult[]> {
  const subscriptions = await webhookRegistry.getSubscriptionsForEvent(event);

  if (subscriptions.length === 0) {
    return [];
  }

  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendWebhook(sub.url, payload, sub.secret, options))
  );

  return results.map((result) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          success: false,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : 'Unknown error',
          delivery_id: payload.id,
        }
  );
}

export { sendWebhook };
