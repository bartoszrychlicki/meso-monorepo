import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OrderStatus } from '@/types/enums';

const {
  mockKitchenRepo,
  mockOrdersRepo,
  mockCreateServerRepository,
} = vi.hoisted(() => {
  const kitchenRepo = {
    findMany: vi.fn(),
  };

  const ordersRepo = {
    findMany: vi.fn(),
  };

  return {
    mockKitchenRepo: kitchenRepo,
    mockOrdersRepo: ordersRepo,
    mockCreateServerRepository: vi.fn((collectionName: string) => {
      if (collectionName === 'kitchen_tickets') return kitchenRepo;
      if (collectionName === 'orders') return ordersRepo;
      throw new Error(`Unexpected collection: ${collectionName}`);
    }),
  };
});

vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: mockCreateServerRepository,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: vi.fn(),
  }),
}));

import { GET } from '../route';

function makeTicket(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'ticket-1',
    order_id: 'order-1',
    order_number: 'ZAM-20260312-001',
    location_id: 'loc-1',
    status: OrderStatus.PENDING,
    items: [],
    priority: 0,
    estimated_minutes: 10,
    created_at: '2026-03-12T10:00:00.000Z',
    updated_at: '2026-03-12T10:00:00.000Z',
    ...overrides,
  };
}

describe('GET /api/kitchen/tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_DATA_BACKEND;
  });

  it('hides orphaned and inactive-order tickets from the active KDS board', async () => {
    mockKitchenRepo.findMany.mockResolvedValue([
      makeTicket({ id: 'ticket-active', order_id: 'order-active', status: OrderStatus.PENDING }),
      makeTicket({ id: 'ticket-unpaid-online', order_id: 'order-unpaid-online', status: OrderStatus.PENDING }),
      makeTicket({ id: 'ticket-pay-on-pickup', order_id: 'order-pay-on-pickup', status: OrderStatus.PENDING }),
      makeTicket({ id: 'ticket-orphan', order_id: '', status: OrderStatus.PREPARING }),
      makeTicket({ id: 'ticket-cancelled', order_id: 'order-cancelled', status: OrderStatus.READY }),
    ]);
    mockOrdersRepo.findMany.mockResolvedValue([
      {
        id: 'order-active',
        status: OrderStatus.CONFIRMED,
        payment_method: 'cash',
        payment_status: 'pending',
      },
      {
        id: 'order-unpaid-online',
        status: OrderStatus.PENDING,
        payment_method: 'online',
        payment_status: 'pending',
      },
      {
        id: 'order-pay-on-pickup',
        status: OrderStatus.CONFIRMED,
        payment_method: 'pay_on_pickup',
        payment_status: 'pay_on_pickup',
      },
      {
        id: 'order-cancelled',
        status: OrderStatus.CANCELLED,
        payment_method: 'online',
        payment_status: 'paid',
      },
    ]);

    const response = await GET(
      new NextRequest(new URL('http://localhost:3000/api/kitchen/tickets'))
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tickets).toHaveLength(2);
    expect(body.tickets.map((ticket: { id: string }) => ticket.id)).toEqual([
      'ticket-active',
      'ticket-pay-on-pickup',
    ]);
  });

  it('keeps only delivered tickets with a linked delivered order in completed view', async () => {
    mockKitchenRepo.findMany.mockResolvedValue([
      makeTicket({
        id: 'ticket-delivered',
        order_id: 'order-delivered',
        status: OrderStatus.DELIVERED,
        completed_at: '2026-03-12T10:15:00.000Z',
      }),
      makeTicket({
        id: 'ticket-stale',
        order_id: 'order-stale',
        status: OrderStatus.DELIVERED,
        completed_at: '2026-03-12T10:20:00.000Z',
      }),
      makeTicket({
        id: 'ticket-no-order',
        order_id: '',
        status: OrderStatus.DELIVERED,
        completed_at: '2026-03-12T10:30:00.000Z',
      }),
    ]);
    mockOrdersRepo.findMany.mockResolvedValue([
      { id: 'order-delivered', status: OrderStatus.DELIVERED },
      { id: 'order-stale', status: OrderStatus.CANCELLED },
    ]);

    const response = await GET(
      new NextRequest(
        new URL('http://localhost:3000/api/kitchen/tickets?filter=completed_today')
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tickets).toHaveLength(1);
    expect(body.tickets[0].id).toBe('ticket-delivered');
  });
});
