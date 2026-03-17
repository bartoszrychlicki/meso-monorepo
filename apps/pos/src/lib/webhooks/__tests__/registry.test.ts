import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = {
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
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
    mockRepo.findMany.mockResolvedValue([]);
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

  it('returns an existing active subscription instead of creating a duplicate', async () => {
    mockRepo.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        events: ['order.cancelled', 'order.status_changed'],
        secret: 'secret-1234567890abcdef',
        is_active: true,
        created_at: '2026-03-12T00:00:00.000Z',
        updated_at: '2026-03-12T00:01:00.000Z',
      },
    ]);

    const result = await webhookRegistry.register(
      'https://example.com/webhook',
      ['order.status_changed', 'order.cancelled', 'order.status_changed'],
      'secret-1234567890abcdef'
    );

    expect(result.id).toBe('sub-1');
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('reactivates an identical inactive subscription instead of creating a duplicate', async () => {
    mockRepo.findMany.mockResolvedValue([
      {
        id: 'sub-2',
        url: 'https://example.com/webhook',
        events: ['order.cancelled', 'order.status_changed'],
        secret: 'secret-1234567890abcdef',
        is_active: false,
        created_at: '2026-03-12T00:00:00.000Z',
        updated_at: '2026-03-12T00:01:00.000Z',
      },
    ]);
    mockRepo.update.mockResolvedValue({
      id: 'sub-2',
      url: 'https://example.com/webhook',
      events: ['order.cancelled', 'order.status_changed'],
      secret: 'secret-1234567890abcdef',
      is_active: true,
      created_at: '2026-03-12T00:00:00.000Z',
      updated_at: '2026-03-12T00:02:00.000Z',
    });

    const result = await webhookRegistry.register(
      'https://example.com/webhook',
      ['order.status_changed', 'order.cancelled'],
      'secret-1234567890abcdef'
    );

    expect(mockRepo.update).toHaveBeenCalledWith('sub-2', {
      is_active: true,
      events: ['order.cancelled', 'order.status_changed'],
    });
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(result.is_active).toBe(true);
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
