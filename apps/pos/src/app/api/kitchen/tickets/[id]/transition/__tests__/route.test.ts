import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OrderStatus } from '@/types/enums';

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
    mockOrdersRepo.findById.mockResolvedValue({
      id: orderId,
      status_history: [],
    });
    mockOrdersRepo.update.mockResolvedValue({});
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
});
