import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn(),
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

vi.mock('@/lib/api-keys', () => ({
  hasPermission: vi.fn(),
}));

const mockOrdersRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const mockCustomersRepo = {
  findById: vi.fn(),
  update: vi.fn(),
};
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: (collection: string) =>
    collection === 'customers' ? mockCustomersRepo : mockOrdersRepo,
}));

const mockRpc = vi.fn();
const mockKitchenTicketsIn = vi.fn();
const mockKitchenTicketsEq = vi.fn();
const mockKitchenTicketsSelect = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
  createServiceClient: () => ({
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      if (table !== 'orders_kitchen_tickets') {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: mockKitchenTicketsSelect,
      };
    }),
  }),
}));

vi.mock('@/schemas/order', () => ({
  UpdateOrderSchema: {
    safeParse: (data: unknown) => {
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return { success: true, data };
      }
      return {
        success: false,
        error: { issues: [{ path: [], message: 'Invalid data' }] },
      };
    },
  },
}));

import { authenticateRequest, authorizeRequest, isApiKey } from '@/lib/api/auth';
import { hasPermission } from '@/lib/api-keys';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/enums';
import { GET, PUT, DELETE } from '../orders/[id]/route';

const mockAuthenticateRequest = authenticateRequest as ReturnType<typeof vi.fn>;
const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = hasPermission as ReturnType<typeof vi.fn>;

const validApiKey = {
  id: 'key-1',
  permissions: ['orders:read', 'orders:write'],
};

const mockOrder = {
  id: 'order-1',
  order_number: 'ZAM-001',
  status: 'pending',
  channel: 'online',
  items: [],
  subtotal: 59.8,
  tax: 4.78,
  discount: 0,
  total: 64.58,
};

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/v1/orders/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue(validApiKey);
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);
    mockKitchenTicketsSelect.mockReturnValue({ eq: mockKitchenTicketsEq });
    mockKitchenTicketsEq.mockReturnValue({ in: mockKitchenTicketsIn });
    mockKitchenTicketsIn.mockResolvedValue({ data: [], error: null });
  });

  it('returns an order by ID', async () => {
    mockOrdersRepo.findById.mockResolvedValue(mockOrder);

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1');
    const res = await GET(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('order-1');
  });

  it('returns 404 for non-existent order', async () => {
    mockOrdersRepo.findById.mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/orders/nonexistent');
    const res = await GET(req, makeParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/v1/orders/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue(validApiKey);
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);
    mockKitchenTicketsSelect.mockReturnValue({ eq: mockKitchenTicketsEq });
    mockKitchenTicketsEq.mockReturnValue({ in: mockKitchenTicketsIn });
    mockKitchenTicketsIn.mockResolvedValue({ data: [], error: null });
  });

  it('updates an order', async () => {
    mockOrdersRepo.findById.mockResolvedValue(mockOrder);
    mockOrdersRepo.update.mockResolvedValue({
      ...mockOrder,
      notes: 'Bez cebuli',
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'Bez cebuli' }),
    });
    const res = await PUT(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.notes).toBe('Bez cebuli');
  });

  it('uses transactional replace_order_items RPC when items are provided', async () => {
    mockOrdersRepo.findById.mockResolvedValue(mockOrder);
    mockRpc.mockResolvedValue({
      data: {
        ...mockOrder,
        items: [
          {
            id: 'new-item-id',
            product_id: 'prod-1',
            product_name: 'Ramen',
            quantity: 2,
            unit_price: 30,
            subtotal: 60,
            modifiers: [],
          },
        ],
        subtotal: 60,
        tax: 4.8,
        total: 64.8,
      },
      error: null,
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'PUT',
      body: JSON.stringify({
        items: [
          {
            product_id: 'prod-1',
            product_name: 'Ramen',
            quantity: 2,
            unit_price: 30,
            modifiers: [],
          },
        ],
      }),
    });
    const res = await PUT(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.subtotal).toBe(60);
    expect(mockRpc).toHaveBeenCalledWith(
      'replace_order_items',
      expect.objectContaining({
        p_order_id: 'order-1',
        p_items: expect.any(Array),
        p_order_items: expect.any(Array),
      })
    );
  });

  it('returns 404 when updating non-existent order', async () => {
    mockOrdersRepo.findById.mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/orders/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'test' }),
    });
    const res = await PUT(req, makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });

  it('rejects editing for terminal statuses', async () => {
    mockOrdersRepo.findById.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.OUT_FOR_DELIVERY,
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'Nowa notatka' }),
    });
    const res = await PUT(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('ORDER_EDIT_NOT_ALLOWED');
  });

  it('blocks total changes for paid online orders', async () => {
    mockOrdersRepo.findById.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.READY,
      payment_method: PaymentMethod.ONLINE,
      payment_status: PaymentStatus.PAID,
      items: [
        {
          id: 'item-1',
          product_id: 'prod-1',
          product_name: 'Ramen',
          quantity: 1,
          unit_price: 20,
          subtotal: 20,
          modifiers: [],
        },
      ],
      total: 20,
      discount: 0,
      tax: 1.48,
      status_history: [],
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'PUT',
      body: JSON.stringify({
        items: [
          {
            id: 'item-1',
            product_id: 'prod-1',
            product_name: 'Ramen',
            quantity: 2,
            unit_price: 20,
            modifiers: [],
          },
        ],
      }),
    });
    const res = await PUT(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('ONLINE_PAYMENT_AMOUNT_LOCKED');
  });

  it('syncs customer phone when a linked CRM customer exists', async () => {
    mockOrdersRepo.findById.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PREPARING,
      customer_id: 'customer-1',
      customer_phone: '+48 500 100 200',
      payment_method: PaymentMethod.CARD,
      payment_status: PaymentStatus.PENDING,
      status_history: [],
    });
    mockOrdersRepo.update.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PREPARING,
      customer_id: 'customer-1',
      customer_phone: '+48 500 200 300',
      payment_method: PaymentMethod.CARD,
      payment_status: PaymentStatus.PENDING,
      status_history: [],
    });
    mockCustomersRepo.findById.mockResolvedValue({
      id: 'customer-1',
      phone: '+48 500 100 200',
    });
    mockCustomersRepo.update.mockResolvedValue({
      id: 'customer-1',
      phone: '+48 500 200 300',
    });

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'PUT',
      body: JSON.stringify({
        customer_phone: '+48 500 200 300',
        notes: 'Bez zmian w składzie',
      }),
    });
    const res = await PUT(req, makeParams('order-1'));

    expect(res.status).toBe(200);
    expect(mockCustomersRepo.update).toHaveBeenCalledWith(
      'customer-1',
      expect.objectContaining({
        phone: '+48 500 200 300',
      })
    );
  });
});

describe('DELETE /api/v1/orders/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue(validApiKey);
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);
  });

  it('deletes an order', async () => {
    mockOrdersRepo.findById.mockResolvedValue(mockOrder);
    mockOrdersRepo.delete.mockResolvedValue(undefined);

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it('returns 404 when deleting non-existent order', async () => {
    mockOrdersRepo.findById.mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/orders/nonexistent', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });
});
