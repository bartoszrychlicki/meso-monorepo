import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiNotFound,
  apiValidationError,
} from '@/lib/api/response';
import { webhookRegistry } from '@/lib/webhooks/registry';
import { z } from 'zod';
import { WebhookEvent } from '@/lib/webhooks/types';

const VALID_EVENTS: WebhookEvent[] = [
  'order.status_changed',
  'order.cancelled',
];

const RegisterWebhookSchema = z.object({
  url: z.string().url('Wymagany prawidłowy URL'),
  events: z
    .array(z.enum(['order.status_changed', 'order.cancelled']))
    .min(1, 'Wymagany przynajmniej jeden event'),
  secret: z.string().min(16, 'Secret musi mieć minimum 16 znaków'),
  description: z.string().optional(),
});

/**
 * GET /api/v1/webhooks
 * List registered webhooks.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'webhooks:manage');
  if (!isApiKey(auth)) return auth;

  const webhooks = await webhookRegistry.list();

  // Redact secrets in response
  const redacted = webhooks.map(({ secret, ...rest }) => ({
    ...rest,
    secret: '***',
  }));

  return apiSuccess(redacted, { total: redacted.length });
}

/**
 * POST /api/v1/webhooks
 * Register a new webhook subscription.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'webhooks:manage');
  if (!isApiKey(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = RegisterWebhookSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const { url, events, secret, description } = validation.data;

  const webhook = await webhookRegistry.register(url, events, secret, description);

  // Redact secret in response
  const { secret: _, ...redacted } = webhook;

  return apiCreated({ ...redacted, secret: '***' });
}

/**
 * DELETE /api/v1/webhooks
 * Delete a webhook subscription by ID (passed as query param ?id=).
 */
export async function DELETE(request: NextRequest) {
  const auth = await authorizeRequest(request, 'webhooks:manage');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return apiError('MISSING_PARAM', 'Wymagany parametr: id', 400);
  }

  const existing = await webhookRegistry.findById(id);
  if (!existing) {
    return apiNotFound('Webhook');
  }

  await webhookRegistry.unregister(id);
  return apiSuccess({ deleted: true });
}
