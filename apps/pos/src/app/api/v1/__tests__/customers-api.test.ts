import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

const mockServerRepo = {
  findAll: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};
vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: () => mockServerRepo,
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { GET, POST } from '../crm/customers/route';

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
    last_order_date: '2026-02-20T12:00:00.000Z',
    first_order_date: '2026-01-15T10:00:00.000Z',
  },
};

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('GET /api/v1/crm/customers', () => {
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

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('lists customers with default pagination', async () => {
    mockServerRepo.findAll.mockResolvedValue({
      data: [mockCustomer],
      total: 1,
      page: 1,
      per_page: 50,
    });

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].first_name).toBe('Jan');
  });

  it('searches customers by phone', async () => {
    mockServerRepo.findMany.mockResolvedValue([mockCustomer]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers?phone=%2B48123456789');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].phone).toBe('+48123456789');
  });

  it('returns empty array for non-existent phone', async () => {
    mockServerRepo.findMany.mockResolvedValue([]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers?phone=%2B48999999999');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });

  it('searches customers by email', async () => {
    mockServerRepo.findMany.mockResolvedValue([mockCustomer]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers?email=jan@example.com');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('searches customers by text query', async () => {
    // findMany for "is_active" filter returns all active customers
    mockServerRepo.findMany.mockResolvedValue([mockCustomer]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers?search=Kowalski');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('filters customers by loyalty tier', async () => {
    mockServerRepo.findMany.mockResolvedValue([mockCustomer]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers?tier=bronze');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('paginates results', async () => {
    mockServerRepo.findAll.mockResolvedValue({
      data: [mockCustomer],
      total: 50,
      page: 3,
      per_page: 10,
    });

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers?page=3&per_page=10');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.meta.page).toBe(3);
    expect(body.meta.per_page).toBe(10);
    expect(body.meta.total).toBe(50);
  });
});

describe('POST /api/v1/crm/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  const validCustomerBody = {
    first_name: 'Anna',
    last_name: 'Nowak',
    phone: '+48987654321',
    email: 'anna@example.com',
    marketing_consent: true,
  };

  it('creates a customer successfully', async () => {
    mockServerRepo.findMany.mockResolvedValue([]);
    mockServerRepo.create.mockResolvedValue({
      id: 'new-cust-id',
      ...validCustomerBody,
      loyalty_points: 0,
      loyalty_tier: 'bronze',
      is_active: true,
    });

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify(validCustomerBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.first_name).toBe('Anna');
    expect(body.data.loyalty_points).toBe(0);
    expect(body.data.loyalty_tier).toBe('bronze');
  });

  it('returns 409 for duplicate phone number', async () => {
    // First findMany call (phone check) returns existing customer
    mockServerRepo.findMany.mockResolvedValueOnce([mockCustomer]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify({
        ...validCustomerBody,
        phone: '+48123456789', // existing phone
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_PHONE');
  });

  it('returns 409 for duplicate email', async () => {
    // First findMany call (phone check) returns empty
    mockServerRepo.findMany.mockResolvedValueOnce([]);
    // Second findMany call (email check) returns existing customer
    mockServerRepo.findMany.mockResolvedValueOnce([mockCustomer]);

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify({
        ...validCustomerBody,
        email: 'jan@example.com', // existing email
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('returns 422 for invalid body', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'A' }), // too short, missing required fields
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('creates customer without optional email', async () => {
    mockServerRepo.findMany.mockResolvedValue([]);
    mockServerRepo.create.mockResolvedValue({
      id: 'new-cust-id',
      first_name: 'Walk',
      last_name: 'In',
      phone: '+48111222333',
      email: null,
      loyalty_points: 0,
      loyalty_tier: 'bronze',
      is_active: true,
    });

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Walk',
        last_name: 'In',
        phone: '+48111222333',
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.email).toBeNull();
  });

  it('creates customer with addresses', async () => {
    mockServerRepo.findMany.mockResolvedValue([]);
    mockServerRepo.create.mockImplementation(
      (data: Record<string, unknown>) => Promise.resolve({ id: 'new-id', ...data })
    );

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify({
        ...validCustomerBody,
        addresses: [
          {
            label: 'Dom',
            street: 'Marszalkowska',
            building_number: '10',
            postal_code: '00-001',
            city: 'Warszawa',
            is_default: true,
          },
        ],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.addresses).toHaveLength(1);
    expect(body.data.addresses[0].city).toBe('Warszawa');
  });

  it('initializes new customer with correct defaults', async () => {
    mockServerRepo.findMany.mockResolvedValue([]);

    let createdData: Record<string, unknown> = {};
    mockServerRepo.create.mockImplementation(
      (data: Record<string, unknown>) => {
        createdData = data;
        return Promise.resolve({ id: 'new-id', ...data });
      }
    );

    const req = makeRequest('http://localhost:3000/api/v1/crm/customers', {
      method: 'POST',
      body: JSON.stringify(validCustomerBody),
    });
    await POST(req);

    expect(createdData.loyalty_points).toBe(0);
    expect(createdData.loyalty_tier).toBe('bronze');
    expect(createdData.is_active).toBe(true);
    expect(createdData.rfm_segment).toBeNull();
    expect((createdData.order_history as Record<string, unknown>)?.total_orders).toBe(0);
  });
});
