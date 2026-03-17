import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OrderStatus } from '@/types/enums';

const { mockRollbackOrderStatus } = vi.hoisted(() => ({
  mockRollbackOrderStatus: vi.fn(),
}));

vi.mock('@/modules/orders/server/route-auth', () => ({
  authorizeOrderRoute: vi.fn(),
}));

vi.mock('@/lib/orders/status-transition', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/orders/status-transition')>();

  return {
    ...actual,
    rollbackOrderStatus: mockRollbackOrderStatus,
  };
});

import { POST } from '../orders/[id]/status/rollback/route';
import { InvalidOrderStatusRollbackError } from '@/lib/orders/status-transition';
import { authorizeOrderRoute } from '@/modules/orders/server/route-auth';

const mockAuthorizeOrderRoute = authorizeOrderRoute as ReturnType<typeof vi.fn>;

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/orders/order-1/status/rollback'),
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

describe('POST /api/v1/orders/:id/status/rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeOrderRoute.mockResolvedValue({ kind: 'session', actorId: 'user-1' });
    mockRollbackOrderStatus.mockResolvedValue({
      id: 'order-1',
      status: 'preparing',
    });
  });

  it('rolls back the order status for a session-authenticated user', async () => {
    const response = await POST(
      makeRequest(),
      makeParams('order-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('preparing');
    expect(mockRollbackOrderStatus).toHaveBeenCalledWith({
      orderId: 'order-1',
      note: undefined,
      changed_by: 'user-1',
    });
  });

  it('returns 422 when rollback is blocked', async () => {
    mockRollbackOrderStatus.mockRejectedValueOnce(
      new InvalidOrderStatusRollbackError(OrderStatus.DELIVERED, 'terminal_status')
    );

    const response = await POST(
      makeRequest(),
      makeParams('order-1')
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('INVALID_STATUS_ROLLBACK');
  });
});
