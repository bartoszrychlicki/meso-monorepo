import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = {
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
};

vi.mock('@/lib/data/server-repository-factory', () => ({
  createServerRepository: vi.fn(() => mockRepo),
}));

import { webhookRegistry } from '../registry';

describe('webhookRegistry server persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers webhooks through the server repository without persisting description', async () => {
    mockRepo.create.mockImplementation(async (payload) => ({
      id: 'sub-1',
      created_at: '2026-03-12T00:00:00.000Z',
      updated_at: '2026-03-12T00:00:00.000Z',
      ...payload,
    }));

    await webhookRegistry.register(
      'https://example.com/webhook',
      ['order.status_changed'],
      'secret-1234567890abcdef',
      'Example description'
    );

    expect(mockRepo.create).toHaveBeenCalledWith({
      url: 'https://example.com/webhook',
      events: ['order.status_changed'],
      secret: 'secret-1234567890abcdef',
      is_active: true,
    });
  });

  it('lists and filters subscriptions through the server repository', async () => {
    mockRepo.findAll.mockResolvedValue({
      data: [{ id: 'sub-1' }],
      total: 1,
      page: 1,
      per_page: 100,
      total_pages: 1,
    });
    mockRepo.findMany.mockResolvedValue([{ id: 'sub-1', is_active: true }]);
    mockRepo.findById.mockResolvedValue({ id: 'sub-1' });

    await expect(webhookRegistry.list()).resolves.toEqual([{ id: 'sub-1' }]);
    await expect(
      webhookRegistry.getSubscriptionsForEvent('order.status_changed')
    ).resolves.toEqual([{ id: 'sub-1', is_active: true }]);
    await expect(webhookRegistry.findById('sub-1')).resolves.toEqual({ id: 'sub-1' });
  });
});
