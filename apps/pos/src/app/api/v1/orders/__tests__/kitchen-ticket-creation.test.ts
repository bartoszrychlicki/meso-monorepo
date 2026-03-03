import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ---- //

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

vi.mock('@/modules/orders/repository', () => ({
  ordersRepository: {
    findMany: vi.fn(),
    generateOrderNumber: vi.fn(),
  },
}));

vi.mock('@/modules/menu/repository', () => ({
  productsRepository: {
    findById: vi.fn(),
  },
}));

const mockServerRepo = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  bulkCreate: vi.fn(),
};

vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: vi.fn(() => mockServerRepo),
}));

// ---- Imports (after mocks) ---- //

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { ordersRepository } from '@/modules/orders/repository';
import { productsRepository } from '@/modules/menu/repository';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { POST } from '../route';
import { OrderStatus } from '@/types/enums';

// ---- Typed mock helpers ---- //

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;
const mockFindById = productsRepository.findById as ReturnType<typeof vi.fn>;
const mockFindMany = ordersRepository.findMany as ReturnType<typeof vi.fn>;
const mockGenerateOrderNumber = ordersRepository.generateOrderNumber as ReturnType<typeof vi.fn>;
const mockCreateServerRepo = createServerRepository as unknown as ReturnType<typeof vi.fn>;

// ---- Fixtures ---- //

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:read', 'orders:write'],
};

const mockProduct = {
  id: 'prod-1',
  name: 'Ramen',
  is_available: true,
  variants: [],
};

const validOrderInput = {
  channel: 'delivery_app',
  source: 'delivery',
  location_id: 'loc-1',
  customer_id: 'cust-1',
  customer_name: 'Test Customer',
  customer_phone: '+48500100100',
  payment_method: 'pay_on_pickup',
  payment_status: 'pay_on_pickup',
  delivery_type: 'pickup' as const,
  items: [
    {
      product_id: 'prod-1',
      product_name: 'Ramen',
      quantity: 2,
      unit_price: 35,
      modifiers: [
        { modifier_id: 'mod-1', name: 'Extra Chashu', price: 8, quantity: 1 },
      ],
    },
  ],
};

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

// ---- Tests ---- //

describe('POST /api/v1/orders — kitchen ticket auto-creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Auth: always pass
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);

    // Product lookup: always return valid product
    mockFindById.mockResolvedValue(mockProduct);

    // No duplicate order (idempotency check)
    mockFindMany.mockResolvedValue([]);

    // Order number generation
    mockGenerateOrderNumber.mockResolvedValue('DEL-20260301-001');

    // createServerRepository returns the server repo mock
    mockCreateServerRepo.mockReturnValue(mockServerRepo);

    // Server repo create: 1st call = order, 2nd call = kitchen ticket
    mockServerRepo.create.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'order-1', ...data })
    );
    mockServerRepo.bulkCreate.mockResolvedValue(undefined);
  });

  it('creates a kitchen ticket alongside the order', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderInput),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    // createServerRepository called for 'orders' and 'kitchen_tickets'
    expect(mockCreateServerRepo).toHaveBeenCalledWith('kitchen_tickets');
    expect(mockCreateServerRepo).toHaveBeenCalledWith('orders_order_items');
    // create called twice: once for order, once for kitchen ticket
    expect(mockServerRepo.create).toHaveBeenCalledTimes(2);
  });

  it('persists order items into orders_order_items table', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderInput),
    });

    await POST(req);

    expect(mockServerRepo.bulkCreate).toHaveBeenCalledTimes(1);
    const [payload] = mockServerRepo.bulkCreate.mock.calls[0];

    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      order_id: 'order-1',
      product_id: 'prod-1',
      quantity: 2,
      unit_price: 35,
      total_price: 86,
      variant_name: undefined,
      notes: undefined,
    });
    expect(payload[0].addons).toEqual([
      {
        id: 'mod-1',
        name: 'Extra Chashu',
        price: 8,
        quantity: 1,
        modifier_action: 'add',
      },
    ]);
  });

  it('creates kitchen ticket with correct order_id, order_number, and location_id', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderInput),
    });

    await POST(req);

    // Kitchen ticket is the 2nd create call (index 1)
    const ticketArg = mockServerRepo.create.mock.calls[1][0];
    expect(ticketArg.order_id).toBe('order-1');
    expect(ticketArg.order_number).toBe('DEL-20260301-001');
    expect(ticketArg.location_id).toBe('loc-1');
  });

  it('maps order items to kitchen ticket items with product_name, quantity, and modifier names', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderInput),
    });

    await POST(req);

    const ticketArg = mockServerRepo.create.mock.calls[1][0];
    const kitchenItems = ticketArg.items;

    expect(kitchenItems).toHaveLength(1);
    expect(kitchenItems[0].product_name).toBe('Ramen');
    expect(kitchenItems[0].quantity).toBe(2);
    expect(kitchenItems[0].modifiers).toEqual(['Extra Chashu']);
    expect(kitchenItems[0].is_done).toBe(false);
  });

  it('sets kitchen ticket status to pending', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderInput),
    });

    await POST(req);

    const ticketArg = mockServerRepo.create.mock.calls[1][0];
    expect(ticketArg.status).toBe(OrderStatus.PENDING);
  });

  it('still returns 201 when kitchen ticket creation fails', async () => {
    // First call (order) succeeds, second call (kitchen ticket) fails
    mockServerRepo.create
      .mockResolvedValueOnce({ id: 'order-1', ...validOrderInput, order_number: 'DEL-20260301-001' })
      .mockRejectedValueOnce(new Error('DB connection lost'));

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderInput),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.order_number).toBe('DEL-20260301-001');
  });
});
