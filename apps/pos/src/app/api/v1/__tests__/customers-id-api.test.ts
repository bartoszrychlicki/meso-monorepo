import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

const mockServerRepo = {
  findById: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
};
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { GET, PUT, DELETE } from '../crm/customers/[id]/route';

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

const validApiKey = {
  id: 'key-1',
  permissions: ['crm:read', 'crm:write'],
};

const mockCustomer = {
  id: 'cust-1',
  first_name: 'Jan',
  last_name: 'Kowalski',
  email: 'jan@example.com',
  phone: '+48123456789',
  loyalty_points: 150,
  loyalty_tier: 'bronze',
  is_active: true,
  addresses: [],
  preferences: {},
  order_history: {
    total_orders: 5,
    total_spent: 250.0,
    average_order_value: 50.0,
    last_order_date: null,
    first_order_date: null,
  },
};

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/v1/crm/customers/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('returns a customer by ID', async () => {
    mockServerRepo.findById.mockResolvedValue(mockCustomer);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1');
    const res = await GET(req, makeParams('cust-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('cust-1');
    expect(body.data.first_name).toBe('Jan');
  });

  it('returns 404 for non-existent customer', async () => {
    mockServerRepo.findById.mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/nonexistent');
    const res = await GET(req, makeParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 without API key', async () => {
    const unauthorizedResponse = new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED' } }),
      { status: 401 }
    );
    mockAuth.mockResolvedValue(unauthorizedResponse);
    mockIsApiKey.mockReturnValue(false);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1');
    const res = await GET(req, makeParams('cust-1'));
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/crm/customers/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('updates customer fields', async () => {
    mockServerRepo.findById.mockResolvedValue(mockCustomer);
    mockServerRepo.update.mockResolvedValue({
      ...mockCustomer,
      first_name: 'Janusz',
      marketing_consent: true,
    });

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1', {
      method: 'PUT',
      body: JSON.stringify({ first_name: 'Janusz', marketing_consent: true }),
    });
    const res = await PUT(req, makeParams('cust-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.first_name).toBe('Janusz');
  });

  it('returns 404 when updating non-existent customer', async () => {
    mockServerRepo.findById.mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ first_name: 'Test' }),
    });
    const res = await PUT(req, makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });

  it('returns 409 for duplicate phone on update', async () => {
    mockServerRepo.findById.mockResolvedValue(mockCustomer);
    mockServerRepo.findMany.mockResolvedValue([{
      id: 'other-cust',
      phone: '+48999888777',
      is_active: true,
    }]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1', {
      method: 'PUT',
      body: JSON.stringify({ phone: '+48999888777' }),
    });
    const res = await PUT(req, makeParams('cust-1'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_PHONE');
  });

  it('returns 409 for duplicate email on update', async () => {
    mockServerRepo.findById.mockResolvedValue(mockCustomer);
    // First findMany (phone check) - not called because phone isn't changing
    // findMany for email check returns existing
    mockServerRepo.findMany.mockResolvedValue([{
      id: 'other-cust',
      email: 'taken@example.com',
      is_active: true,
    }]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1', {
      method: 'PUT',
      body: JSON.stringify({ email: 'taken@example.com' }),
    });
    const res = await PUT(req, makeParams('cust-1'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('returns 400 for invalid JSON', async () => {
    mockServerRepo.findById.mockResolvedValue(mockCustomer);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1', {
      method: 'PUT',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, makeParams('cust-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });
});

describe('DELETE /api/v1/crm/customers/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('soft-deletes a customer', async () => {
    mockServerRepo.findById.mockResolvedValue(mockCustomer);
    mockServerRepo.update.mockResolvedValue({
      ...mockCustomer,
      is_active: false,
    });

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/cust-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('cust-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(mockServerRepo.update).toHaveBeenCalledWith(
      'cust-1',
      expect.objectContaining({ is_active: false })
    );
  });

  it('returns 404 when deleting non-existent customer', async () => {
    mockServerRepo.findById.mockResolvedValue(null);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers/nonexistent', {
      method: 'DELETE',
    });
    const res = await DELETE(req, makeParams('nonexistent'));

    expect(res.status).toBe(404);
  });
});
