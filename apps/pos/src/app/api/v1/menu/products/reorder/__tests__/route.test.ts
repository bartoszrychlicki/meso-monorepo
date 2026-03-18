import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
const mockAuthGetUser = vi.fn();
const mockCategoryEq = vi.fn();
const mockStaffMaybeSingle = vi.fn();
const mockStaffEq = vi.fn(() => ({
  maybeSingle: mockStaffMaybeSingle,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mockAuthGetUser,
    },
    from: mockFrom,
  }),
  createServiceClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { POST } from '../route';

const mockAuthorizeRequest = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

const categoryId = '11111111-1111-4111-8111-111111111111';
const productIds = [
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
];

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/v1/menu/products/reorder', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/menu/products/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });
    mockAuthorizeRequest.mockResolvedValue({ id: 'key-1', permissions: ['menu:write'] });
    mockIsApiKey.mockReturnValue(true);
    mockSelect.mockImplementation((columns: string) => {
      if (columns === 'is_active') {
        return { eq: mockStaffEq };
      }

      return { eq: mockCategoryEq };
    });
    mockStaffMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    mockCategoryEq.mockResolvedValue({
      data: productIds.map((id) => ({ id, category_id: categoryId })),
      error: null,
    });
    mockRpc.mockResolvedValue({ error: null });
  });

  it('reorders a full category payload', async () => {
    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds].reverse(),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('reorder_menu_products', {
      p_category_id: categoryId,
      p_product_ids: [...productIds].reverse(),
    });
  });

  it('allows active staff sessions without requiring an API key', async () => {
    mockAuthGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'staff-1',
          email: 'staff@example.com',
        },
      },
    });
    mockStaffMaybeSingle.mockResolvedValueOnce({
      data: {
        is_active: true,
      },
      error: null,
    });

    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds].reverse(),
    }));

    expect(response.status).toBe(200);
    expect(mockAuthorizeRequest).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledOnce();
  });

  it('rejects duplicate product ids', async () => {
    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [productIds[0], productIds[0]],
    }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects incomplete category payloads', async () => {
    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [productIds[0]],
    }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects products outside the category', async () => {
    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds, '44444444-4444-4444-8444-444444444444'],
    }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
