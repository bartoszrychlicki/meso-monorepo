import type { P24RefundRecord } from '@meso/core';

export interface DeliveryRefundRequest {
  orderId: string;
  requestedBy?: string;
  requestedFrom?: 'pos' | 'kds' | 'system';
}

export interface DeliveryRefundResponse {
  status: 'requested';
  refund: P24RefundRecord;
}

export class DeliveryRefundRequestError extends Error {
  readonly statusCode?: number;
  readonly details?: unknown;

  constructor(message: string, options?: { statusCode?: number; details?: unknown }) {
    super(message);
    this.name = 'DeliveryRefundRequestError';
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}

function getDeliveryConfig() {
  const baseUrl = process.env.DELIVERY_API_URL?.trim();
  const apiKey = process.env.DELIVERY_INTERNAL_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    const missingVars = [
      !baseUrl ? 'DELIVERY_API_URL' : null,
      !apiKey ? 'DELIVERY_INTERNAL_API_KEY' : null,
    ].filter(Boolean).join(', ');

    throw new Error(`Missing required delivery environment variables: ${missingVars}`);
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey,
  };
}

export async function requestDeliveryRefund(
  payload: DeliveryRefundRequest
): Promise<DeliveryRefundResponse> {
  const { baseUrl, apiKey } = getDeliveryConfig();
  const response = await fetch(`${baseUrl}/api/payments/p24/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new DeliveryRefundRequestError(
      json.error || 'Failed to request delivery refund',
      {
        statusCode: response.status,
        details: json.details,
      }
    );
  }

  return json as DeliveryRefundResponse;
}
