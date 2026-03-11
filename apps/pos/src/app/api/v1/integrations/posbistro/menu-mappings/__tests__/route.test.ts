import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

const { mockListMappings, mockUpsertMapping } = vi.hoisted(() => ({
  mockListMappings: vi.fn(),
  mockUpsertMapping: vi.fn(),
}));

vi.mock('@/lib/integrations/posbistro/menu-mapping', () => ({
  listPosbistroMenuMappings: mockListMappings,
  upsertPosbistroMenuMapping: mockUpsertMapping,
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { GET, POST } from '../route';

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('POS /api/v1/integrations/posbistro/menu-mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      id: 'key-1',
      permissions: ['menu:read', 'menu:write'],
    });
    mockIsApiKey.mockReturnValue(true);
  });

  it('lists mappings with filters', async () => {
    mockListMappings.mockResolvedValue([
      {
        id: 'mapping-1',
        mapping_type: 'product',
      },
    ]);

    const res = await GET(
      makeRequest(
        'http://localhost:3000/api/v1/integrations/posbistro/menu-mappings?mapping_type=product'
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(mockListMappings).toHaveBeenCalledWith({
      mapping_type: 'product',
      meso_product_id: null,
      meso_variant_id: null,
      meso_modifier_id: null,
      is_active: undefined,
    });
  });

  it('upserts a mapping', async () => {
    mockUpsertMapping.mockResolvedValue({
      id: 'mapping-1',
      mapping_type: 'product',
      posbistro_variation_id: 'pb-variation-1',
    });

    const res = await POST(
      makeRequest('http://localhost:3000/api/v1/integrations/posbistro/menu-mappings', {
        method: 'POST',
        body: JSON.stringify({
          mapping_type: 'product',
          meso_product_id: '11111111-1111-4111-8111-111111111111',
          posbistro_variation_id: '22222222-2222-4222-8222-222222222222',
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('mapping-1');
    expect(mockUpsertMapping).toHaveBeenCalledTimes(1);
  });
});
