import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock modules before imports
vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

vi.mock('@/modules/orders/repository', () => ({
  ordersRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    findByStatus: vi.fn(),
    findByDateRange: vi.fn(),
    findByCustomer: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    generateOrderNumber: vi.fn(),
  },
}));

vi.mock('@/modules/menu/repository', () => ({
  productsRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    findMany: vi.fn(),
  },
}));

const mockServerRepo = {
  create: vi.fn(),
};
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { ordersRepository } from '@/modules/orders/repository';
import { productsRepository } from '@/modules/menu/repository';
import { GET, POST } from '../orders/route';

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:read', 'orders:write'],
};

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('GET /api/v1/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('returns 401 when no API key provided', async () => {
    const unauthorizedResponse = new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }),
      { status: 401 }
    );
    mockAuth.mockResolvedValue(unauthorizedResponse);
    mockIsApiKey.mockReturnValue(false);

    const req = makeRequest('http://localhost:3000/api/v1/orders');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('lists orders with default pagination', async () => {
    const mockOrders = [
      { id: 'order-1', order_number: 'ZAM-001', status: 'pending' },
      { id: 'order-2', order_number: 'ZAM-002', status: 'preparing' },
    ];
    (ordersRepository.findAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockOrders,
      total: 2,
      page: 1,
      per_page: 50,
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it('filters orders by status', async () => {
    const pendingOrders = [
      { id: 'order-1', order_number: 'ZAM-001', status: 'pending' },
    ];
    (ordersRepository.findByStatus as ReturnType<typeof vi.fn>).mockResolvedValue(pendingOrders);

    const req = makeRequest('http://localhost:3000/api/v1/orders?status=pending');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(ordersRepository.findByStatus).toHaveBeenCalledWith('pending');
  });

  it('filters orders by date range', async () => {
    (ordersRepository.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = makeRequest(
      'http://localhost:3000/api/v1/orders?date_from=2026-02-01&date_to=2026-02-28'
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(ordersRepository.findByDateRange).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
  });

  it('filters orders by customer', async () => {
    (ordersRepository.findByCustomer as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = makeRequest('http://localhost:3000/api/v1/orders?customer=Kowalski');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(ordersRepository.findByCustomer).toHaveBeenCalledWith('Kowalski');
  });

  it('paginates results', async () => {
    const mockOrders = Array.from({ length: 5 }, (_, i) => ({
      id: `order-${i}`,
      order_number: `ZAM-00${i}`,
    }));
    (ordersRepository.findAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockOrders,
      total: 25,
      page: 2,
      per_page: 5,
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders?page=2&per_page=5');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.meta.page).toBe(2);
    expect(body.meta.per_page).toBe(5);
  });
});

describe('POST /api/v1/orders', () => {
  const mockProduct = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Burger Classic',
    is_available: true,
    variants: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
    // By default, return a valid product for any findById call
    (productsRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProduct);
  });

  const validOrderBody = {
    channel: 'online',
    source: 'delivery',
    location_id: '550e8400-e29b-41d4-a716-446655440000',
    customer_name: 'Jan Kowalski',
    customer_phone: '+48123456789',
    payment_method: 'card',
    items: [
      {
        product_id: '550e8400-e29b-41d4-a716-446655440001',
        product_name: 'Burger Classic',
        quantity: 2,
        unit_price: 29.9,
        modifiers: [],
      },
    ],
  };

  it('creates an order successfully', async () => {
    (ordersRepository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (ordersRepository.generateOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(
      'ZAM-20260226-001'
    );
    mockServerRepo.create.mockResolvedValue({
      id: 'new-order-id',
      order_number: 'ZAM-20260226-001',
      status: 'pending',
      ...validOrderBody,
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.order_number).toBe('ZAM-20260226-001');
  });

  it('returns 422 for invalid body', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('returns existing order for duplicate external_order_id (idempotency)', async () => {
    const existingOrder = {
      id: 'existing-order-id',
      external_order_id: 'EXT-001',
      status: 'pending',
    };
    (ordersRepository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([existingOrder]);

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...validOrderBody,
        external_order_id: 'EXT-001',
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('existing-order-id');
  });

  it('returns 401 without API key', async () => {
    const unauthorizedResponse = new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }),
      { status: 401 }
    );
    mockAuth.mockResolvedValue(unauthorizedResponse);
    mockIsApiKey.mockReturnValue(false);

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 422 for non-existent product_id', async () => {
    (productsRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].message).toContain('nie istnieje');
  });

  it('returns 422 for unavailable product', async () => {
    (productsRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockProduct,
      is_available: false,
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(validOrderBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error.details[0].message).toContain('nie jest dostępny');
  });

  it('returns 422 for non-existent variant_id', async () => {
    (productsRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockProduct,
      variants: [{ id: 'var-1', name: 'Maly', is_available: true }],
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...validOrderBody,
        items: [
          {
            ...validOrderBody.items[0],
            variant_id: 'non-existent-variant',
          },
        ],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.details[0].message).toContain('nie istnieje w produkcie');
  });

  it('calculates order totals correctly', async () => {
    (ordersRepository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (ordersRepository.generateOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValue(
      'ZAM-20260226-002'
    );

    mockServerRepo.create.mockImplementation(
      (data: Record<string, unknown>) => {
        return Promise.resolve({ id: 'order-id', items: [], ...data });
      }
    );

    const orderWithModifiers = {
      ...validOrderBody,
      items: [
        {
          product_id: '550e8400-e29b-41d4-a716-446655440001',
          product_name: 'Burger Classic',
          quantity: 2,
          unit_price: 29.9,
          modifiers: [
            {
              modifier_id: 'mod-1',
              name: 'Extra ser',
              price: 4.0,
              quantity: 1,
              modifier_action: 'add',
            },
          ],
        },
      ],
      discount: 5.0,
    };

    const req = makeRequest('http://localhost:3000/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(orderWithModifiers),
    });
    await POST(req);

    // First create call is the order, second is kitchen ticket
    const createdData = mockServerRepo.create.mock.calls[0][0];

    // subtotal = 2 * (29.90 + 4.00) = 67.80
    // tax = 67.80 * 0.08 = 5.42
    // total = 67.80 + 5.42 - 5.00 = 68.22
    expect(createdData.subtotal).toBe(67.8);
    expect(createdData.tax).toBe(5.42);
    expect(createdData.total).toBe(68.22);
  });
});
