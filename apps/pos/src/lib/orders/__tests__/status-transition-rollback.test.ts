import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/orders/server-loyalty', () => ({
  awardOrderLoyaltyPoints: vi.fn(),
}));

const { mockKitchenTicketsIn, mockKitchenTicketsEq, mockKitchenTicketsUpdate } = vi.hoisted(() => ({
  mockKitchenTicketsIn: vi.fn(),
  mockKitchenTicketsEq: vi.fn(),
  mockKitchenTicketsUpdate: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'orders_kitchen_tickets') {
        throw new Error(`Unexpected table access in test: ${table}`);
      }

      return {
        update: mockKitchenTicketsUpdate,
      };
    }),
  })),
}));

const mockServerRepo = {
  findById: vi.fn(),
  update: vi.fn(),
};
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}));

const { mockScheduleWebhookDispatch } = vi.hoisted(() => ({
  mockScheduleWebhookDispatch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/webhooks/schedule', () => ({
  scheduleWebhookDispatch: mockScheduleWebhookDispatch,
}));

const {
  mockBuildPosbistroConfirmBaseUrl,
  mockEnsureCustomerForOrder,
  mockSubmitPosbistroOrder,
} = vi.hoisted(() => ({
  mockBuildPosbistroConfirmBaseUrl: vi.fn(),
  mockEnsureCustomerForOrder: vi.fn(),
  mockSubmitPosbistroOrder: vi.fn(),
}));
vi.mock('@/lib/integrations/posbistro/service', () => ({
  buildPosbistroConfirmBaseUrl: mockBuildPosbistroConfirmBaseUrl,
  ensureCustomerForOrder: mockEnsureCustomerForOrder,
  submitPosbistroOrder: mockSubmitPosbistroOrder,
}));

import { awardOrderLoyaltyPoints } from '@/modules/orders/server-loyalty';
import {
  InvalidOrderStatusRollbackError,
  rollbackOrderStatus,
} from '../status-transition';

const mockFindById = mockServerRepo.findById as ReturnType<typeof vi.fn>;
const mockUpdate = mockServerRepo.update as ReturnType<typeof vi.fn>;
const mockAwardOrderLoyaltyPoints = awardOrderLoyaltyPoints as ReturnType<typeof vi.fn>;

const baseOrder = {
  id: 'order-1',
  order_number: 'WEB-20260303-001',
  status: 'ready',
  payment_status: 'pending',
  status_history: [
    { status: 'pending', timestamp: '2026-03-03T10:00:00.000Z' },
    { status: 'confirmed', timestamp: '2026-03-03T10:01:00.000Z' },
    { status: 'accepted', timestamp: '2026-03-03T10:02:00.000Z' },
    { status: 'preparing', timestamp: '2026-03-03T10:03:00.000Z' },
    { status: 'ready', timestamp: '2026-03-03T10:04:00.000Z' },
  ],
  channel: 'delivery_app',
  source: 'delivery',
  customer_id: 'customer-1',
  customer_phone: '+48500100100',
  items: [],
  total: 89,
  estimated_ready_at: '2026-03-03T10:30:00.000Z',
  created_at: '2026-03-03T10:00:00.000Z',
  confirmed_at: '2026-03-03T10:01:00.000Z',
  preparing_at: '2026-03-03T10:03:00.000Z',
  ready_at: '2026-03-03T10:04:00.000Z',
};

describe('rollbackOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKitchenTicketsUpdate.mockReturnValue({ eq: mockKitchenTicketsEq });
    mockKitchenTicketsEq.mockReturnValue({ in: mockKitchenTicketsIn });
    mockKitchenTicketsIn.mockResolvedValue({ error: null });
  });

  it('rolls back to the previous status, clears later timestamps and dispatches webhook', async () => {
    mockFindById.mockResolvedValue(baseOrder);
    mockUpdate.mockResolvedValue({
      ...baseOrder,
      status: 'preparing',
      ready_at: null,
      status_history: [
        ...baseOrder.status_history,
        {
          status: 'preparing',
          timestamp: '2026-03-03T10:05:00.000Z',
          note: 'Cofnięto status z "Gotowe" do "W przygotowaniu"',
        },
      ],
    });

    const updated = await rollbackOrderStatus(
      {
        orderId: 'order-1',
      },
      {
        orderRepo: mockServerRepo,
        now: () => new Date('2026-03-03T10:05:00.000Z'),
      }
    );

    expect(updated.status).toBe('preparing');
    expect(mockUpdate).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: 'preparing',
        ready_at: null,
        picked_up_at: null,
        delivered_at: null,
        cancelled_at: null,
      })
    );
    expect(mockKitchenTicketsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'preparing',
        completed_at: null,
        updated_at: '2026-03-03T10:05:00.000Z',
      })
    );
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledWith(
      'order.status_changed',
      expect.objectContaining({
        status: 'preparing',
        previous_status: 'ready',
      })
    );
    expect(mockSubmitPosbistroOrder).not.toHaveBeenCalled();
    expect(mockAwardOrderLoyaltyPoints).not.toHaveBeenCalled();
  });

  it('clears confirmed and later timestamps when rolling back to pending', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'confirmed',
      status_history: [
        { status: 'pending', timestamp: '2026-03-03T10:00:00.000Z' },
        { status: 'confirmed', timestamp: '2026-03-03T10:01:00.000Z' },
      ],
    });
    mockUpdate.mockResolvedValue({
      ...baseOrder,
      status: 'pending',
      confirmed_at: null,
      preparing_at: null,
      ready_at: null,
    });

    await rollbackOrderStatus(
      { orderId: 'order-1' },
      {
        orderRepo: mockServerRepo,
        now: () => new Date('2026-03-03T10:05:00.000Z'),
      }
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: 'pending',
        confirmed_at: null,
        preparing_at: null,
        ready_at: null,
        picked_up_at: null,
        delivered_at: null,
      })
    );
  });

  it('sets the target lifecycle timestamp when rollback reopens a previously cleared status', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'preparing',
      status_history: [
        { status: 'pending', timestamp: '2026-03-03T10:00:00.000Z' },
        { status: 'confirmed', timestamp: '2026-03-03T10:01:00.000Z' },
        { status: 'preparing', timestamp: '2026-03-03T10:03:00.000Z' },
        { status: 'ready', timestamp: '2026-03-03T10:04:00.000Z' },
        { status: 'preparing', timestamp: '2026-03-03T10:05:00.000Z' },
      ],
      ready_at: null,
    });
    mockUpdate.mockResolvedValue({
      ...baseOrder,
      status: 'ready',
      ready_at: '2026-03-03T10:06:00.000Z',
    });

    await rollbackOrderStatus(
      { orderId: 'order-1' },
      {
        orderRepo: mockServerRepo,
        now: () => new Date('2026-03-03T10:06:00.000Z'),
      }
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: 'ready',
        ready_at: '2026-03-03T10:06:00.000Z',
      })
    );
  });

  it('blocks rollback for terminal statuses', async () => {
    mockFindById.mockResolvedValue({
      ...baseOrder,
      status: 'delivered',
      status_history: [
        { status: 'pending', timestamp: '2026-03-03T10:00:00.000Z' },
        { status: 'ready', timestamp: '2026-03-03T10:04:00.000Z' },
        { status: 'delivered', timestamp: '2026-03-03T10:05:00.000Z' },
      ],
    });

    await expect(
      rollbackOrderStatus(
        { orderId: 'order-1' },
        {
          orderRepo: mockServerRepo,
        }
      )
    ).rejects.toBeInstanceOf(InvalidOrderStatusRollbackError);
  });
});
