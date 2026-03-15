import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

function chain(result: { data: unknown; error: unknown; count?: number | null } = { data: null, error: null, count: null }) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve(result);
      }
      if (prop === 'then') {
        return (resolve: (value: typeof result) => void) => resolve(result);
      }
      return () => new Proxy({}, handler);
    },
  };

  return new Proxy({}, handler);
}

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockFetchCustomerByAuthId = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/customers', () => ({
  fetchCustomerByAuthId: (...args: unknown[]) => mockFetchCustomerByAuthId(...args),
}));

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/promo-codes/validate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/promo-codes/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates a code using min_order_amount and channel', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'crm_promotions') {
        return chain({
          data: {
            code: 'MESO10',
            is_active: true,
            valid_from: '2026-03-10T10:00:00.000Z',
            valid_until: null,
            min_order_amount: 30,
            max_uses: null,
            max_uses_per_customer: 1,
            channels: ['delivery'],
            required_loyalty_tier: null,
            first_order_only: false,
            discount_type: 'percent',
            discount_value: 10,
            free_item_id: null,
          },
          error: null,
        });
      }

      return chain({ data: null, error: null, count: 0 });
    });

    const { POST } = await import('../validate/route');
    const response = await POST(makeRequest({ code: 'MESO10', subtotal: 40, channel: 'delivery' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.discount_type).toBe('percent');
  });

  it('rejects a code when the channel does not match', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'crm_promotions') {
        return chain({
          data: {
            code: 'MESO10',
            is_active: true,
            valid_from: '2026-03-10T10:00:00.000Z',
            valid_until: null,
            min_order_amount: 0,
            max_uses: null,
            max_uses_per_customer: 1,
            channels: ['pickup'],
            required_loyalty_tier: null,
            first_order_only: false,
            discount_type: 'percent',
            discount_value: 10,
            free_item_id: null,
          },
          error: null,
        });
      }

      return chain({ data: null, error: null, count: 0 });
    });

    const { POST } = await import('../validate/route');
    const response = await POST(makeRequest({ code: 'MESO10', subtotal: 40, channel: 'delivery' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valid).toBe(false);
    expect(body.error).toContain('kanału dostawa');
  });

  it('rejects a code when loyalty tier is too low', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFetchCustomerByAuthId.mockResolvedValue({ id: 'customer-1', loyalty_tier: 'bronze' });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'crm_promotions') {
        return chain({
          data: {
            code: 'MESO10',
            is_active: true,
            valid_from: '2026-03-10T10:00:00.000Z',
            valid_until: null,
            min_order_amount: 0,
            max_uses: null,
            max_uses_per_customer: 1,
            channels: ['delivery', 'pickup'],
            required_loyalty_tier: 'silver',
            first_order_only: false,
            discount_type: 'percent',
            discount_value: 10,
            free_item_id: null,
          },
          error: null,
        });
      }

      return chain({ data: null, error: null, count: 0 });
    });

    const { POST } = await import('../validate/route');
    const response = await POST(makeRequest({ code: 'MESO10', subtotal: 40, channel: 'delivery' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valid).toBe(false);
    expect(body.error).toContain('poziomu Srebrny');
  });
});
