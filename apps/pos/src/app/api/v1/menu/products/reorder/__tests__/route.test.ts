import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));
vi.mock('@/modules/menu/server/route-auth', () => ({
  authorizeMenuRoute: vi.fn(),
}));

const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
const mockCategoryEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { authorizeMenuRoute } from '@/modules/menu/server/route-auth';
import { POST } from '../route';

const mockAuthorizeRequest = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;
const mockAuthorizeMenuRoute = authorizeMenuRoute as ReturnType<typeof vi.fn>;

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
    mockAuthorizeRequest.mockResolvedValue({ id: 'key-1', permissions: ['menu:write'] });
    mockIsApiKey.mockReturnValue(true);
    mockAuthorizeMenuRoute.mockResolvedValue({ kind: 'api_key', actorId: 'key-1' });
    mockSelect.mockImplementation(() => ({
      eq: mockCategoryEq,
    }));
    mockCategoryEq.mockImplementation(() => ({
      order: mockOrder,
    }));
    mockOrder
      .mockImplementationOnce(() => ({
        order: mockOrder,
      }))
      .mockResolvedValueOnce({
        data: productIds.map((id) => ({ id })),
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

  it('allows authorized staff sessions without requiring an API key', async () => {
    mockAuthorizeMenuRoute.mockResolvedValueOnce({
      kind: 'session',
      actorId: 'staff-1',
    });

    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds].reverse(),
    }));

    expect(response.status).toBe(200);
    expect(mockAuthorizeMenuRoute).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'menu:write'
    );
    expect(mockRpc).toHaveBeenCalledOnce();
  });

  it('rejects staff sessions without menu write permission', async () => {
    const forbiddenResponse = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Brak wymaganego uprawnienia: menu:write',
        },
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    mockAuthorizeMenuRoute.mockResolvedValueOnce(forbiddenResponse as never);

    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds].reverse(),
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(mockRpc).not.toHaveBeenCalled();
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

  it('expands incomplete category payloads using the current category order', async () => {
    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [productIds[0]],
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.product_ids).toEqual(productIds);
    expect(mockRpc).toHaveBeenCalledWith('reorder_menu_products', {
      p_category_id: categoryId,
      p_product_ids: productIds,
    });
  });

  it('ignores stale products outside the category when rebuilding the current order', async () => {
    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds, '44444444-4444-4444-8444-444444444444'],
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.product_ids).toEqual(productIds);
    expect(mockRpc).toHaveBeenCalledWith('reorder_menu_products', {
      p_category_id: categoryId,
      p_product_ids: productIds,
    });
  });

  it('returns validation error when the category no longer exists', async () => {
    mockOrder.mockReset();
    mockOrder
      .mockImplementationOnce(() => ({
        order: mockOrder,
      }))
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    const response = await POST(makeRequest({
      category_id: categoryId,
      product_ids: [...productIds].reverse(),
    }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
