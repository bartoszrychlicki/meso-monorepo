import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = {
  create: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
};

const mockFrom = vi.fn();

vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: vi.fn(() => mockRepo),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  revokeApiKey,
} from '../api-keys';

describe('api-keys server persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates API keys through the server repository', async () => {
    mockRepo.create.mockImplementation(async (payload) => ({
      id: 'key-1',
      ...payload,
      created_at: '2026-03-12T00:00:00.000Z',
      updated_at: '2026-03-12T00:00:00.000Z',
    }));

    const result = await createApiKey({
      name: 'Webhook key',
      permissions: ['webhooks:manage'],
      created_by: 'admin',
    });

    expect(result.rawKey).toMatch(/^meso_k1_/);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Webhook key',
        permissions: ['webhooks:manage'],
        is_active: true,
        created_by: 'admin',
      })
    );
  });

  it('lists, revokes and deletes API keys through the server repository', async () => {
    mockRepo.findAll.mockResolvedValue({
      data: [{ id: 'key-1', name: 'Webhook key' }],
      total: 1,
      page: 1,
      per_page: 100,
      total_pages: 1,
    });

    await expect(listApiKeys()).resolves.toEqual([{ id: 'key-1', name: 'Webhook key' }]);

    await revokeApiKey('key-1');
    expect(mockRepo.update).toHaveBeenCalledWith(
      'key-1',
      expect.objectContaining({ is_active: false })
    );

    await deleteApiKey('key-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('key-1');
  });
});
