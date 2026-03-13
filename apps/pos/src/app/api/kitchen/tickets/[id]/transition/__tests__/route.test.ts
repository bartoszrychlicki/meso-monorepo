import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OrderStatus } from '@/types/enums';

vi.mock('@/modules/orders/server-loyalty', () => ({
  awardOrderLoyaltyPoints: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ mocked: true })),
}))

const { mockScheduleWebhookDispatch } = vi.hoisted(() => ({
  mockScheduleWebhookDispatch: vi.fn(),
}))
vi.mock('@/lib/webhooks/schedule', () => ({
  scheduleWebhookDispatch: mockScheduleWebhookDispatch,
}))

const {
  mockBuildPosbistroConfirmBaseUrl,
  mockEnsureCustomerForOrder,
  mockSubmitPosbistroOrder,
} = vi.hoisted(() => ({
  mockBuildPosbistroConfirmBaseUrl: vi.fn((origin?: string) =>
    `${origin || 'http://localhost:3000'}/api/integrations/posbistro/confirm`
  ),
  mockEnsureCustomerForOrder: vi.fn(async (order) => order),
  mockSubmitPosbistroOrder: vi.fn(),
}))
vi.mock('@/lib/integrations/posbistro/service', () => ({
  buildPosbistroConfirmBaseUrl: mockBuildPosbistroConfirmBaseUrl,
  ensureCustomerForOrder: mockEnsureCustomerForOrder,
  submitPosbistroOrder: mockSubmitPosbistroOrder,
}))

const mockKitchenRepo = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockOrdersRepo = {
  findById: vi.fn(),
  update: vi.fn(),
};

vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: vi.fn((collectionName: string) => {
    if (collectionName === 'kitchen_tickets') return mockKitchenRepo;
    if (collectionName === 'orders') return mockOrdersRepo;
    throw new Error(`Unexpected repository: ${collectionName}`);
  }),
}));

import { createServerRepository } from '@/lib/data/server-repository-factory';
import { awardOrderLoyaltyPoints } from '@/modules/orders/server-loyalty';
import { POST } from '../route';

const mockCreateServerRepo = createServerRepository as unknown as ReturnType<
  typeof vi.fn
>;
const mockAwardOrderLoyaltyPoints = awardOrderLoyaltyPoints as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL('http://localhost:3000/api/kitchen/tickets/ticket-1/transition'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    } as never
  );
}

function makeParams(id = 'ticket-1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/kitchen/tickets/:id/transition', () => {
  const orderId = '11111111-1111-4111-8111-111111111111';
  const baseOrder = {
    id: orderId,
    order_number: 'WEB-20260301-001',
    status: OrderStatus.PENDING,
    payment_status: 'pending',
    channel: 'delivery_app',
    source: 'delivery',
    customer_name: 'Jan Kowalski',
    customer_phone: '+48500100100',
    total: 42,
    items: [
      {
        id: 'item-1',
        product_id: 'prod-1',
        product_name: 'Ramen',
        quantity: 1,
        unit_price: 42,
        modifiers: [],
        subtotal: 42,
      },
    ],
    created_at: '2026-03-01T10:00:00.000Z',
    status_history: [],
  };
  const baseTicket = {
    id: 'ticket-1',
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-01T10:00:00.000Z',
    order_id: orderId,
    order_number: 'ORD-001',
    location_id: 'loc-1',
    status: OrderStatus.PENDING,
    items: [
      {
        id: 'item-1',
        order_item_id: 'order-item-1',
        product_name: 'Ramen',
        quantity: 1,
        modifiers: [],
        is_done: false,
      },
    ],
    priority: 1,
    estimated_minutes: 12,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockKitchenRepo.findById.mockResolvedValue(baseTicket);
    mockKitchenRepo.update.mockResolvedValue({
      ...baseTicket,
      status: OrderStatus.PREPARING,
      started_at: '2026-03-01T10:05:00.000Z',
    });
    mockOrdersRepo.findById.mockResolvedValue(baseOrder);
    mockOrdersRepo.update.mockResolvedValue({
      ...baseOrder,
      status: OrderStatus.PREPARING,
      preparing_at: '2026-03-01T10:05:00.000Z',
      status_history: [
        {
          status: OrderStatus.PREPARING,
          timestamp: '2026-03-01T10:05:00.000Z',
        },
      ],
    });
    mockAwardOrderLoyaltyPoints.mockResolvedValue(100);
  });

  it('transitions pending ticket to preparing and updates linked order status', async () => {
    const request = makeRequest({ action: 'start_preparing' });
    const response = await POST(request, makeParams('ticket-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe(OrderStatus.PREPARING);

    expect(mockCreateServerRepo).toHaveBeenCalledWith('kitchen_tickets');
    expect(mockCreateServerRepo).toHaveBeenCalledWith('orders');
    expect(mockKitchenRepo.update).toHaveBeenCalledWith(
      'ticket-1',
      expect.objectContaining({
        status: OrderStatus.PREPARING,
      })
    );
    expect(mockOrdersRepo.update).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        status: OrderStatus.PREPARING,
        preparing_at: expect.any(String),
      })
    );
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledWith(
      'order.status_changed',
      expect.objectContaining({
        status: 'preparing',
      })
    );
  });

  it('returns 404 when ticket does not exist', async () => {
    mockKitchenRepo.findById.mockResolvedValueOnce(null);

    const request = makeRequest({ action: 'start_preparing' });
    const response = await POST(request, makeParams('missing-ticket'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Kitchen ticket not found');
  });

  it('validates toggle_item payload', async () => {
    const request = makeRequest({ action: 'toggle_item' });
    const response = await POST(request, makeParams('ticket-1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing itemId or isDone for toggle_item');
  });

  it('still transitions ticket when order_id is missing (legacy tickets)', async () => {
    mockKitchenRepo.findById.mockResolvedValueOnce({
      ...baseTicket,
      order_id: null as unknown as string,
    });

    const request = makeRequest({ action: 'start_preparing' });
    const response = await POST(request, makeParams('ticket-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe(OrderStatus.PREPARING);
    expect(mockOrdersRepo.findById).not.toHaveBeenCalled();
    expect(mockOrdersRepo.update).not.toHaveBeenCalled();
  });

  it('delegates delivered transition through shared side effects', async () => {
    mockKitchenRepo.update.mockResolvedValueOnce({
      ...baseTicket,
      status: OrderStatus.DELIVERED,
    });
    mockOrdersRepo.findById.mockResolvedValueOnce({
      ...baseOrder,
      status: OrderStatus.READY,
      customer_id: 'customer-1',
      customer_phone: '+48500100100',
    });
    mockOrdersRepo.update.mockResolvedValueOnce({
      ...baseOrder,
      status: OrderStatus.DELIVERED,
      customer_id: 'customer-1',
      customer_phone: '+48500100100',
      delivered_at: '2026-03-01T10:05:00.000Z',
      status_history: [
        {
          status: OrderStatus.DELIVERED,
          timestamp: '2026-03-01T10:05:00.000Z',
        },
      ],
    });

    const response = await POST(makeRequest({ action: 'mark_served' }), makeParams('ticket-1'));

    expect(response.status).toBe(200);
    expect(mockOrdersRepo.update).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        status: OrderStatus.DELIVERED,
        delivered_at: expect.any(String),
      })
    );
    expect(mockAwardOrderLoyaltyPoints).toHaveBeenCalledTimes(1);
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledWith(
      'order.status_changed',
      expect.objectContaining({
        status: 'delivered',
      })
    );
  });
});
