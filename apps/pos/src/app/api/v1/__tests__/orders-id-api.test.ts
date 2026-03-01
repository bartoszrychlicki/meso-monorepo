import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

vi.mock('@/modules/orders/repository', () => ({
  ordersRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/schemas/order', () => ({
  CreateOrderSchema: {
    partial: () => ({
      safeParse: (data: unknown) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          return { success: true, data };
        }
        return {
          success: false,
          error: { issues: [{ path: [], message: 'Invalid data' }] },
        };
      },
    }),
  },
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { ordersRepository } from '@/modules/orders/repository';
import { GET, PUT, DELETE } from '../orders/[id]/route';

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

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
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('returns an order by ID', async () => {
    (ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1');
    const res = await GET(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('order-1');
  });

  it('returns 404 for non-existent order', async () => {
    (ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

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
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('updates an order', async () => {
    (ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
    (ordersRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
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

  it('returns 404 when updating non-existent order', async () => {
    (ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/orders/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'test' }),
    });
    const res = await PUT(req, makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/orders/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('deletes an order', async () => {
    (ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
    (ordersRepository.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = makeRequest('http://localhost:3000/api/v1/orders/order-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('order-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it('returns 404 when deleting non-existent order', async () => {
    (ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/orders/nonexistent', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });
});
