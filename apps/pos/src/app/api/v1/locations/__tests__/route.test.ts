import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

const validApiKey = {
  id: 'key-1',
  permissions: ['settings:read'],
};

const mockLocation = {
  id: 'loc-1',
  name: 'Kuchnia Centralna',
  type: 'central_kitchen',
  address: { street: 'ul. Testowa 1', city: 'Warszawa', postal_code: '00-001', country: 'PL' },
  phone: '+48123456789',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

// Helper to build chainable Supabase query mock
function createQueryChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ ...result, count: result.count ?? 0 }),
  };
  return chain;
}

describe('GET /api/v1/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  it('returns unauthorized when auth fails', async () => {
    const errorResponse = new Response(JSON.stringify({ success: false }), { status: 401 });
    mockAuth.mockResolvedValue(errorResponse);
    mockIsApiKey.mockReturnValue(false);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('/api/v1/locations'));
    expect(res.status).toBe(401);
  });

  it('returns list of locations', async () => {
    const chain = createQueryChain({ data: [mockLocation], error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('/api/v1/locations'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Kuchnia Centralna');
    expect(body.meta.total).toBe(1);
  });

  it('filters by active=true', async () => {
    const chain = createQueryChain({ data: [mockLocation], error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    const { GET } = await import('../route');
    await GET(makeRequest('/api/v1/locations?active=true'));

    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('returns 500 on database error', async () => {
    const chain = createQueryChain({ data: null, error: { message: 'DB error' }, count: 0 });
    mockFrom.mockReturnValue(chain);

    const { GET } = await import('../route');
    const res = await GET(makeRequest('/api/v1/locations'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe('GET /api/v1/locations/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(validApiKey);
    mockIsApiKey.mockReturnValue(true);
  });

  const mockDeliveryConfig = {
    id: 'dc-1',
    location_id: 'loc-1',
    is_delivery_active: true,
    delivery_radius_km: 5,
    delivery_fee: 10,
    min_order_amount: 30,
    estimated_delivery_minutes: 45,
    opening_time: '11:00',
    closing_time: '21:00',
    ordering_paused_until_date: null,
  };

  const mockReceiptConfig = {
    id: 'rc-1',
    location_id: 'loc-1',
    receipt_header: 'MESO',
    receipt_footer: 'Dziękujemy!',
    print_automatically: true,
    show_logo: true,
  };

  const mockKdsConfig = {
    id: 'kc-1',
    location_id: 'loc-1',
    alert_time_minutes: 5,
    auto_accept_orders: false,
    sound_enabled: true,
    display_priority: true,
  };

  it('returns unauthorized when auth fails', async () => {
    const errorResponse = new Response(JSON.stringify({ success: false }), { status: 401 });
    mockAuth.mockResolvedValue(errorResponse);
    mockIsApiKey.mockReturnValue(false);

    const { GET } = await import('../[id]/route');
    const res = await GET(
      makeRequest('/api/v1/locations/loc-1'),
      { params: Promise.resolve({ id: 'loc-1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when location not found', async () => {
    const notFoundChain = createQueryChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(notFoundChain);

    const { GET } = await import('../[id]/route');
    const res = await GET(
      makeRequest('/api/v1/locations/nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('returns location with all configs', async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      const results = [
        { data: mockLocation, error: null },
        { data: mockDeliveryConfig, error: null },
        { data: mockReceiptConfig, error: null },
        { data: mockKdsConfig, error: null },
      ];
      const result = results[callIndex++] || results[0];
      return createQueryChain(result);
    });

    const { GET } = await import('../[id]/route');
    const res = await GET(
      makeRequest('/api/v1/locations/loc-1'),
      { params: Promise.resolve({ id: 'loc-1' }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Kuchnia Centralna');
    expect(body.data.delivery_config).toBeTruthy();
    expect(body.data.delivery_config.is_delivery_active).toBe(true);
    expect(body.data.delivery_config.ordering_paused_until_date).toBeNull();
    expect(body.data.receipt_config).toBeTruthy();
    expect(body.data.receipt_config.receipt_header).toBe('MESO');
    expect(body.data.kds_config).toBeTruthy();
    expect(body.data.kds_config.alert_time_minutes).toBe(5);
  });

  it('returns location with null configs when none exist', async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      const results = [
        { data: mockLocation, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ];
      const result = results[callIndex++] || results[0];
      return createQueryChain(result);
    });

    const { GET } = await import('../[id]/route');
    const res = await GET(
      makeRequest('/api/v1/locations/loc-1'),
      { params: Promise.resolve({ id: 'loc-1' }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.delivery_config).toBeNull();
    expect(body.data.receipt_config).toBeNull();
    expect(body.data.kds_config).toBeNull();
  });
});
