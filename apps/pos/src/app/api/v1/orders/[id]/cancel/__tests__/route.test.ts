import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockCancelOrderWithOptionalRefund } = vi.hoisted(() => ({
  mockCancelOrderWithOptionalRefund: vi.fn(),
}));

vi.mock('@/lib/orders/cancel-order', () => ({
  cancelOrderWithOptionalRefund: mockCancelOrderWithOptionalRefund,
}));

vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn().mockResolvedValue({ status: 401 }),
  isApiKey: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/api-keys', () => ({
  hasPermission: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-1' },
        },
      }),
    },
  })),
}));

import { POST } from '../route';
import { InvalidOrderCancellationReasonError } from '@/lib/orders/status-transition';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/orders/order-1/cancel'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    } as never
  );
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/v1/orders/:id/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelOrderWithOptionalRefund.mockResolvedValue({
      order: { id: 'order-1', status: 'cancelled' },
      refund: { status: 'requested' },
    });
  });

  it('cancels order and forwards refund intent', async () => {
    const response = await POST(
      makeRequest({
        closure_reason_code: 'high_load',
        request_refund: true,
        requested_from: 'pos',
      }),
      makeParams('order-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.refund.status).toBe('requested');
    expect(mockCancelOrderWithOptionalRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        closure_reason_code: 'high_load',
        request_refund: true,
        requested_from: 'pos',
        changed_by: 'user-1',
      })
    );
  });

  it('returns validation error when reason is missing', async () => {
    mockCancelOrderWithOptionalRefund.mockRejectedValueOnce(
      new InvalidOrderCancellationReasonError()
    );

    const response = await POST(
      makeRequest({
        request_refund: true,
      }),
      makeParams('order-1')
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('INVALID_CANCELLATION_REASON');
  });
});
