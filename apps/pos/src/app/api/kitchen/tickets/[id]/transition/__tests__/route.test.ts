import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OrderStatus } from '@/types/enums';

vi.mock('@/modules/orders/server-loyalty', () => ({
  awardOrderLoyaltyPoints: vi.fn(),
}))

const { mockCancelOrderWithOptionalRefund } = vi.hoisted(() => ({
  mockCancelOrderWithOptionalRefund: vi.fn(),
}))
vi.mock('@/lib/orders/cancel-order', () => ({
  cancelOrderWithOptionalRefund: mockCancelOrderWithOptionalRefund,
}))

const { mockSendPickupTimeAdjustedEmail } = vi.hoisted(() => ({
  mockSendPickupTimeAdjustedEmail: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/orders/pickup-time-adjustment-email', () => ({
  sendPickupTimeAdjustedEmail: mockSendPickupTimeAdjustedEmail,
}))

const { mockScheduleWebhookDispatch } = vi.hoisted(() => ({
  mockScheduleWebhookDispatch: vi.fn().mockResolvedValue(undefined),
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
import { POST } from '../route';

const mockCreateServerRepo = createServerRepository as unknown as ReturnType<
  typeof vi.fn
>;

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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const baseOrder = {
    id: orderId,
    order_number: 'WEB-20260301-001',
    status: OrderStatus.PENDING,
    payment_status: 'pending',
    payment_method: 'pay_on_pickup',
    channel: 'delivery_app',
    source: 'delivery',
    delivery_type: 'pickup',
    scheduled_time: '2026-03-01T11:30:00.000Z',
    customer_name: 'Jan Kowalski',
    customer_phone: '+48500100100',
    delivery_address: {
      firstName: 'Jan',
      email: 'jan@example.com',
    },
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
    metadata: {},
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T10:05:00.000Z'));
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'supabase');
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
    mockCancelOrderWithOptionalRefund.mockResolvedValue({
      order: {
        ...baseOrder,
        status: OrderStatus.CANCELLED,
      },
      refund: {
        status: 'not_requested',
      },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.useRealTimers();
  });

  it('transitions pending ticket to preparing and updates linked order status', async () => {
    const request = makeRequest({ action: 'start_preparing' });
    const response = await POST(request, makeParams('ticket-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe(OrderStatus.PREPARING);
    expect(body.ticket.scheduled_time).toBe('2026-03-01T11:30:00.000Z');
    expect(body.ticket.delivery_type).toBe('pickup');

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

  it('keeps enriched schedule fields after toggle_item', async () => {
    mockKitchenRepo.update.mockResolvedValueOnce({
      ...baseTicket,
      items: [
        {
          ...baseTicket.items[0],
          is_done: true,
        },
      ],
    });

    const response = await POST(
      makeRequest({ action: 'toggle_item', itemId: 'item-1', isDone: true }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.items[0].is_done).toBe(true);
    expect(body.ticket.scheduled_time).toBe('2026-03-01T11:30:00.000Z');
    expect(body.ticket.delivery_type).toBe('pickup');
  });

  it('returns updated ticket even when linked order enrichment fails after transition', async () => {
    mockKitchenRepo.update.mockResolvedValueOnce({
      ...baseTicket,
      status: OrderStatus.PREPARING,
      started_at: '2026-03-01T10:05:00.000Z',
    });
    mockOrdersRepo.findById
      .mockResolvedValueOnce(baseOrder)
      .mockRejectedValueOnce(new Error('temporary orders lookup failure'));

    const response = await POST(makeRequest({ action: 'start_preparing' }), makeParams('ticket-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket).toMatchObject({
      id: 'ticket-1',
      status: OrderStatus.PREPARING,
      started_at: '2026-03-01T10:05:00.000Z',
    });
    expect(body.ticket.scheduled_time).toBeUndefined();
    expect(body.ticket.delivery_type).toBeUndefined();
    expect(mockOrdersRepo.update).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        status: OrderStatus.PREPARING,
      })
    );
  });

  it('still transitions ticket when order_id is missing (legacy tickets)', async () => {
    mockKitchenRepo.findById.mockResolvedValueOnce({
      ...baseTicket,
      order_id: null as unknown as string,
    });
    mockKitchenRepo.update.mockResolvedValueOnce({
      ...baseTicket,
      status: OrderStatus.PREPARING,
      order_id: null as unknown as string,
      started_at: '2026-03-01T10:05:00.000Z',
    });

    const request = makeRequest({ action: 'start_preparing' });
    const response = await POST(request, makeParams('ticket-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe(OrderStatus.PREPARING);
    expect(mockOrdersRepo.findById).not.toHaveBeenCalled();
    expect(mockOrdersRepo.update).not.toHaveBeenCalled();
  });

  it('delegates delivered transition through shared status logic', async () => {
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
    expect(mockScheduleWebhookDispatch).toHaveBeenCalledWith(
      'order.status_changed',
      expect.objectContaining({
        status: 'delivered',
      })
    );
  });

  it('cancels a pending ticket and stores the selected rejection reason', async () => {
    mockKitchenRepo.update.mockResolvedValueOnce({
      ...baseTicket,
      status: OrderStatus.CANCELLED,
      completed_at: '2026-03-01T10:05:00.000Z',
    });
    mockCancelOrderWithOptionalRefund.mockResolvedValueOnce({
      order: {
        ...baseOrder,
        status: OrderStatus.CANCELLED,
        cancelled_at: '2026-03-01T10:05:00.000Z',
        closure_reason_code: 'high_load',
        closure_reason: 'Za duży ruch',
      },
      refund: {
        status: 'requested',
      },
    });

    const response = await POST(
      makeRequest({ action: 'cancel_order', reasonCode: 'high_load', requestRefund: true }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cancelResult.refund.status).toBe('requested');
    expect(mockCancelOrderWithOptionalRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        request_refund: true,
        requested_from: 'kds',
      })
    );
    expect(mockOrdersRepo.update).not.toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        status: OrderStatus.CANCELLED,
        closure_reason_code: 'high_load',
        closure_reason: 'Za duży ruch',
      })
    );
  });

  it('rejects cancel_order when no reason is provided', async () => {
    const response = await POST(
      makeRequest({ action: 'cancel_order' }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing cancellation reason');
    expect(mockKitchenRepo.update).not.toHaveBeenCalled();
  });

  it('adjusts pickup time by updating the linked order and preserving the ticket status', async () => {
    const newPickupTime = '2026-03-01T11:50:00.000Z';

    mockOrdersRepo.findById
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce({
        ...baseOrder,
        estimated_ready_at: newPickupTime,
        metadata: {
          pickup_time_adjustments: [
            {
              previous_time: '2026-03-01T11:30:00.000Z',
              new_time: newPickupTime,
              changed_at: '2026-03-01T10:05:00.000Z',
              source: 'kds',
            },
          ],
        },
      });
    mockOrdersRepo.update.mockResolvedValueOnce({
      ...baseOrder,
      estimated_ready_at: newPickupTime,
      metadata: {
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-01T11:30:00.000Z',
            new_time: newPickupTime,
            changed_at: '2026-03-01T10:05:00.000Z',
            source: 'kds',
          },
        ],
      },
    });

    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: newPickupTime }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockKitchenRepo.update).not.toHaveBeenCalled();
    expect(mockOrdersRepo.update).toHaveBeenCalledWith(
      orderId,
      expect.objectContaining({
        estimated_ready_at: newPickupTime,
        metadata: expect.objectContaining({
          pickup_time_adjustments: [
            expect.objectContaining({
              previous_time: '2026-03-01T11:30:00.000Z',
              new_time: newPickupTime,
              source: 'kds',
            }),
          ],
        }),
      })
    );
    expect(body.ticket.status).toBe(OrderStatus.PENDING);
    expect(body.ticket.estimated_ready_at).toBe(newPickupTime);
    expect(mockSendPickupTimeAdjustedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        id: orderId,
      }),
      '2026-03-01T11:30:00.000Z',
      newPickupTime
    );
  });

  it('returns the latest ticket state after adjusting pickup time', async () => {
    const newPickupTime = '2026-03-01T11:50:00.000Z';

    mockKitchenRepo.findById
      .mockResolvedValueOnce(baseTicket)
      .mockResolvedValueOnce({
        ...baseTicket,
        status: OrderStatus.PREPARING,
        started_at: '2026-03-01T10:04:00.000Z',
      });
    mockOrdersRepo.findById
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce({
        ...baseOrder,
        estimated_ready_at: newPickupTime,
        metadata: {
          pickup_time_adjustments: [
            {
              previous_time: '2026-03-01T11:30:00.000Z',
              new_time: newPickupTime,
              changed_at: '2026-03-01T10:05:00.000Z',
              source: 'kds',
            },
          ],
        },
      });
    mockOrdersRepo.update.mockResolvedValueOnce({
      ...baseOrder,
      estimated_ready_at: newPickupTime,
      metadata: {
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-01T11:30:00.000Z',
            new_time: newPickupTime,
            changed_at: '2026-03-01T10:05:00.000Z',
            source: 'kds',
          },
        ],
      },
    });

    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: newPickupTime }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe(OrderStatus.PREPARING);
    expect(body.ticket.started_at).toBe('2026-03-01T10:04:00.000Z');
    expect(body.ticket.estimated_ready_at).toBe(newPickupTime);
  });

  it('returns the adjusted pickup time even when linked order enrichment fails', async () => {
    const newPickupTime = '2026-03-01T11:50:00.000Z';

    mockOrdersRepo.findById
      .mockResolvedValueOnce(baseOrder)
      .mockRejectedValueOnce(new Error('temporary orders lookup failure'));
    mockOrdersRepo.update.mockResolvedValueOnce({
      ...baseOrder,
      estimated_ready_at: newPickupTime,
      metadata: {
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-01T11:30:00.000Z',
            new_time: newPickupTime,
            changed_at: '2026-03-01T10:05:00.000Z',
            source: 'kds',
          },
        ],
      },
    });

    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: newPickupTime }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.estimated_ready_at).toBe(newPickupTime);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[KDS transition] Ticket ticket-1 updated, but linked order enrichment was skipped:',
      expect.any(Error)
    );
  });

  it('falls back to the current ticket when ticket reload fails after pickup adjustment', async () => {
    const newPickupTime = '2026-03-01T11:50:00.000Z';

    mockKitchenRepo.findById
      .mockResolvedValueOnce(baseTicket)
      .mockRejectedValueOnce(new Error('temporary ticket lookup failure'));
    mockOrdersRepo.findById
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce({
        ...baseOrder,
        estimated_ready_at: newPickupTime,
        metadata: {
          pickup_time_adjustments: [
            {
              previous_time: '2026-03-01T11:30:00.000Z',
              new_time: newPickupTime,
              changed_at: '2026-03-01T10:05:00.000Z',
              source: 'kds',
            },
          ],
        },
      });
    mockOrdersRepo.update.mockResolvedValueOnce({
      ...baseOrder,
      estimated_ready_at: newPickupTime,
      metadata: {
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-01T11:30:00.000Z',
            new_time: newPickupTime,
            changed_at: '2026-03-01T10:05:00.000Z',
            source: 'kds',
          },
        ],
      },
    });

    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: newPickupTime }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe(OrderStatus.PENDING);
    expect(body.ticket.estimated_ready_at).toBe(newPickupTime);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[KDS transition] Pickup time adjusted for ticket ticket-1, but ticket reload was skipped:',
      expect.any(Error)
    );
  });

  it('logs pickup time email failures without failing the adjustment', async () => {
    const newPickupTime = '2026-03-01T11:50:00.000Z';

    mockOrdersRepo.findById
      .mockResolvedValueOnce(baseOrder)
      .mockResolvedValueOnce({
        ...baseOrder,
        estimated_ready_at: newPickupTime,
        metadata: {
          pickup_time_adjustments: [
            {
              previous_time: '2026-03-01T11:30:00.000Z',
              new_time: newPickupTime,
              changed_at: '2026-03-01T10:05:00.000Z',
              source: 'kds',
            },
          ],
        },
      });
    mockOrdersRepo.update.mockResolvedValueOnce({
      ...baseOrder,
      estimated_ready_at: newPickupTime,
      metadata: {
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-01T11:30:00.000Z',
            new_time: newPickupTime,
            changed_at: '2026-03-01T10:05:00.000Z',
            source: 'kds',
          },
        ],
      },
    });
    mockSendPickupTimeAdjustedEmail.mockResolvedValueOnce({
      success: false,
      error: 'Resend unavailable',
    });

    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: newPickupTime }),
      makeParams('ticket-1')
    );

    expect(response.status).toBe(200);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[KDS pickup time email] Failed:',
      'Resend unavailable'
    );
  });

  it('rejects pickup time adjustments for delivery orders', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      ...baseOrder,
      delivery_type: 'delivery',
    });

    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: '2026-03-01T11:50:00.000Z' }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe('Pickup time can be adjusted only for pickup orders');
    expect(mockOrdersRepo.update).not.toHaveBeenCalled();
  });

  it('rejects pickup time adjustments in the past', async () => {
    const response = await POST(
      makeRequest({ action: 'adjust_pickup_time', pickupTime: '2026-03-01T09:59:00.000Z' }),
      makeParams('ticket-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Pickup time cannot be in the past');
    expect(mockOrdersRepo.findById).not.toHaveBeenCalled();
  });
});
