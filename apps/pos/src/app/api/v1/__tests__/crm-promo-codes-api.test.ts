import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/modules/crm/server/route-auth', () => ({
  authorizeSessionOrApiKey: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({}) ),
}));

vi.mock('@/modules/crm/server/catalog', () => ({
  listPromotionalCodes: vi.fn(),
  createPromotionalCode: vi.fn(),
  getPromotionalCodeByCode: vi.fn(),
  getPromotionalCodeById: vi.fn(),
  updatePromotionalCode: vi.fn(),
  deletePromotionalCode: vi.fn(),
}));

import { authorizeSessionOrApiKey } from '@/modules/crm/server/route-auth';
import {
  createPromotionalCode,
  deletePromotionalCode,
  getPromotionalCodeByCode,
  getPromotionalCodeById,
  listPromotionalCodes,
  updatePromotionalCode,
} from '@/modules/crm/server/catalog';
import { GET as listRoute, POST } from '../crm/promo-codes/route';
import { DELETE, PATCH } from '../crm/promo-codes/[id]/route';

const mockAuthorize = authorizeSessionOrApiKey as ReturnType<typeof vi.fn>;
const mockListPromotionalCodes = listPromotionalCodes as ReturnType<typeof vi.fn>;
const mockCreatePromotionalCode = createPromotionalCode as ReturnType<typeof vi.fn>;
const mockGetPromotionalCodeByCode = getPromotionalCodeByCode as ReturnType<typeof vi.fn>;
const mockGetPromotionalCodeById = getPromotionalCodeById as ReturnType<typeof vi.fn>;
const mockUpdatePromotionalCode = updatePromotionalCode as ReturnType<typeof vi.fn>;
const mockDeletePromotionalCode = deletePromotionalCode as ReturnType<typeof vi.fn>;

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never);
}

const promoCode = {
  id: 'promo-1',
  code: 'MESO10',
  name: 'Rabat 10%',
  description: 'Testowy kod promocyjny',
  discount_type: 'percent',
  discount_value: 10,
  free_item_id: null,
  min_order_amount: 30,
  first_order_only: false,
  required_loyalty_tier: null,
  trigger_scenario: 'manual',
  max_uses: 100,
  max_uses_per_customer: 1,
  current_uses: 0,
  valid_from: '2026-03-15T10:00:00.000Z',
  valid_until: null,
  is_active: true,
  channels: ['delivery', 'pickup'],
  applicable_product_ids: null,
  created_by: 'user-1',
  created_at: '2026-03-15T10:00:00.000Z',
  updated_at: '2026-03-15T10:00:00.000Z',
};

describe('CRM promotional codes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorize.mockResolvedValue({ kind: 'session', actorId: 'user-1' });
  });

  it('lists promotional codes', async () => {
    mockListPromotionalCodes.mockResolvedValue({
      data: [promoCode],
      total: 1,
      page: 1,
      per_page: 50,
    });

    const response = await listRoute(makeRequest('http://localhost:3000/api/v1/crm/promo-codes'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe('MESO10');
  });

  it('creates a promotional code', async () => {
    mockGetPromotionalCodeByCode.mockResolvedValue(null);
    mockCreatePromotionalCode.mockResolvedValue(promoCode);

    const response = await POST(
      makeRequest('http://localhost:3000/api/v1/crm/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: 'MESO10',
          name: 'Rabat 10%',
          description: 'Testowy kod promocyjny',
          discount_type: 'percent',
          discount_value: 10,
          min_order_amount: 30,
          first_order_only: false,
          required_loyalty_tier: null,
          max_uses: 100,
          max_uses_per_customer: 1,
          valid_from: '2026-03-15T10:00:00.000Z',
          valid_until: null,
          is_active: true,
          channels: ['delivery', 'pickup'],
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.code).toBe('MESO10');
  });

  it('returns 409 for duplicate promotional code', async () => {
    mockGetPromotionalCodeByCode.mockResolvedValue(promoCode);

    const response = await POST(
      makeRequest('http://localhost:3000/api/v1/crm/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: 'MESO10',
          name: 'Rabat 10%',
          discount_type: 'percent',
          discount_value: 10,
          valid_from: '2026-03-15T10:00:00.000Z',
          channels: ['delivery'],
        }),
      })
    );

    expect(response.status).toBe(409);
  });

  it('rejects free-item promotional codes without a product', async () => {
    const response = await POST(
      makeRequest('http://localhost:3000/api/v1/crm/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: 'MESOFREE',
          name: 'Darmowy produkt',
          discount_type: 'free_item',
          discount_value: null,
          free_item_id: null,
          valid_from: '2026-03-15T10:00:00.000Z',
          channels: ['delivery'],
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.details).toContainEqual(
      expect.objectContaining({ field: 'free_item_id' })
    );
  });

  it('updates a promotional code', async () => {
    mockGetPromotionalCodeByCode.mockResolvedValue(null);
    mockUpdatePromotionalCode.mockResolvedValue({ ...promoCode, name: 'Rabat 15%' });

    const response = await PATCH(
      makeRequest('http://localhost:3000/api/v1/crm/promo-codes/promo-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Rabat 15%' }),
      }),
      { params: Promise.resolve({ id: 'promo-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Rabat 15%');
  });

  it('deletes a promotional code', async () => {
    mockGetPromotionalCodeById.mockResolvedValue(promoCode);
    mockDeletePromotionalCode.mockResolvedValue(undefined);

    const response = await DELETE(
      makeRequest('http://localhost:3000/api/v1/crm/promo-codes/promo-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'promo-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });
});
