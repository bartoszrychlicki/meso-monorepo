import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/modules/crm/server/route-auth', () => ({
  authorizeSessionOrApiKey: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({}) ),
}));

vi.mock('@/modules/crm/server/catalog', () => ({
  listRewards: vi.fn(),
  createReward: vi.fn(),
  getRewardById: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
}));

import { authorizeSessionOrApiKey } from '@/modules/crm/server/route-auth';
import {
  createReward,
  deleteReward,
  getRewardById,
  listRewards,
  updateReward,
} from '@/modules/crm/server/catalog';
import { GET as listRoute, POST } from '../crm/rewards/route';
import { DELETE, GET, PATCH } from '../crm/rewards/[id]/route';

const mockAuthorize = authorizeSessionOrApiKey as ReturnType<typeof vi.fn>;
const mockListRewards = listRewards as ReturnType<typeof vi.fn>;
const mockCreateReward = createReward as ReturnType<typeof vi.fn>;
const mockGetRewardById = getRewardById as ReturnType<typeof vi.fn>;
const mockUpdateReward = updateReward as ReturnType<typeof vi.fn>;
const mockDeleteReward = deleteReward as ReturnType<typeof vi.fn>;

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never);
}

const reward = {
  id: 'reward-1',
  name: 'Darmowa dostawa',
  description: 'Nagroda testowa',
  points_cost: 100,
  reward_type: 'free_delivery',
  discount_value: null,
  free_product_id: null,
  icon: null,
  min_tier: 'bronze',
  sort_order: 0,
  is_active: true,
  created_at: '2026-03-15T10:00:00.000Z',
  updated_at: '2026-03-15T10:00:00.000Z',
};

describe('CRM rewards API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorize.mockResolvedValue({ kind: 'session', actorId: 'user-1' });
  });

  it('lists rewards', async () => {
    mockListRewards.mockResolvedValue({
      data: [reward],
      total: 1,
      page: 1,
      per_page: 50,
    });

    const response = await listRoute(makeRequest('http://localhost:3000/api/v1/crm/rewards'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Darmowa dostawa');
  });

  it('creates a reward', async () => {
    mockCreateReward.mockResolvedValue(reward);

    const response = await POST(
      makeRequest('http://localhost:3000/api/v1/crm/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Darmowa dostawa',
          description: 'Nagroda testowa',
          points_cost: 100,
          reward_type: 'free_delivery',
          min_tier: 'bronze',
          sort_order: 0,
          is_active: true,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('reward-1');
  });

  it('returns 422 for invalid reward payload', async () => {
    const response = await POST(
      makeRequest('http://localhost:3000/api/v1/crm/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          points_cost: 0,
          reward_type: 'discount',
          min_tier: 'bronze',
          sort_order: 0,
          is_active: true,
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it('updates a reward', async () => {
    mockUpdateReward.mockResolvedValue({ ...reward, name: 'Rabat 10 PLN' });

    const response = await PATCH(
      makeRequest('http://localhost:3000/api/v1/crm/rewards/reward-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Rabat 10 PLN' }),
      }),
      { params: Promise.resolve({ id: 'reward-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Rabat 10 PLN');
  });

  it('returns 404 when reward does not exist', async () => {
    mockGetRewardById.mockResolvedValue(null);

    const response = await GET(
      makeRequest('http://localhost:3000/api/v1/crm/rewards/missing'),
      { params: Promise.resolve({ id: 'missing' }) }
    );

    expect(response.status).toBe(404);
  });

  it('deletes a reward', async () => {
    mockGetRewardById.mockResolvedValue(reward);
    mockDeleteReward.mockResolvedValue(undefined);

    const response = await DELETE(
      makeRequest('http://localhost:3000/api/v1/crm/rewards/reward-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'reward-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });
});
