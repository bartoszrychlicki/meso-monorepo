import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

const {
  mockDeleteMapping,
  mockGetMappingById,
  mockUpsertMapping,
} = vi.hoisted(() => ({
  mockDeleteMapping: vi.fn(),
  mockGetMappingById: vi.fn(),
  mockUpsertMapping: vi.fn(),
}));

vi.mock('@/lib/integrations/posbistro/menu-mapping', () => ({
  deletePosbistroMenuMapping: mockDeleteMapping,
  getPosbistroMenuMappingById: mockGetMappingById,
  upsertPosbistroMenuMapping: mockUpsertMapping,
}));

import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { DELETE, GET, PUT } from '../route';

const mockAuth = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/v1/integrations/posbistro/menu-mappings/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      id: 'key-1',
      permissions: ['menu:read', 'menu:write'],
    });
    mockIsApiKey.mockReturnValue(true);
  });

  it('returns a single mapping', async () => {
    mockGetMappingById.mockResolvedValue({
      id: 'mapping-1',
      mapping_type: 'product',
    });

    const res = await GET(
      makeRequest('http://localhost:3000/api/v1/integrations/posbistro/menu-mappings/mapping-1'),
      makeParams('mapping-1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('mapping-1');
  });

  it('updates an existing mapping', async () => {
    mockGetMappingById.mockResolvedValue({
      id: 'mapping-1',
      mapping_type: 'product',
      meso_product_id: '11111111-1111-4111-8111-111111111111',
    });
    mockUpsertMapping.mockResolvedValue({
      id: 'mapping-1',
      mapping_type: 'product',
      posbistro_variation_id: 'pb-updated',
    });

    const res = await PUT(
      makeRequest('http://localhost:3000/api/v1/integrations/posbistro/menu-mappings/mapping-1', {
        method: 'PUT',
        body: JSON.stringify({
          mapping_type: 'product',
          meso_product_id: '11111111-1111-4111-8111-111111111111',
          posbistro_variation_id: '22222222-2222-4222-8222-222222222222',
        }),
      }),
      makeParams('mapping-1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.posbistro_variation_id).toBe('pb-updated');
  });

  it('deletes an existing mapping', async () => {
    mockGetMappingById.mockResolvedValue({
      id: 'mapping-1',
      mapping_type: 'product',
    });

    const res = await DELETE(
      makeRequest('http://localhost:3000/api/v1/integrations/posbistro/menu-mappings/mapping-1', {
        method: 'DELETE',
      }),
      makeParams('mapping-1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(mockDeleteMapping).toHaveBeenCalledWith('mapping-1');
  });
});
