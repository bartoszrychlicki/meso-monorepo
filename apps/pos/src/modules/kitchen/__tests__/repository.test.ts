import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitchenTicket } from '@/types/kitchen';

const mockKitchenFindById = vi.fn();
const mockKitchenUpdate = vi.fn();
const mockOrdersFindById = vi.fn();
const mockOrdersUpdate = vi.fn();

vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: vi.fn((collectionName: string) => {
    if (collectionName === 'kitchen_tickets') {
      return {
        findById: (...args: unknown[]) => mockKitchenFindById(...args),
        update: (...args: unknown[]) => mockKitchenUpdate(...args),
      };
    }

    if (collectionName === 'orders') {
      return {
        findById: (...args: unknown[]) => mockOrdersFindById(...args),
        update: (...args: unknown[]) => mockOrdersUpdate(...args),
      };
    }

    return {};
  }),
}));

import { kitchenRepository } from '../repository';

const ticket: KitchenTicket = {
  id: 'ticket-1',
  order_id: 'order-1',
  order_number: 'ORD-1',
  location_id: 'loc-1',
  status: 'pending' as never,
  priority: 1,
  delivery_type: 'pickup',
  estimated_minutes: 20,
  items: [],
  created_at: '2026-03-18T10:00:00.000Z',
  updated_at: '2026-03-18T10:00:00.000Z',
};

describe('kitchenRepository.adjustPickupTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T11:00:00.000Z'));
  });

  it('updates local ticket and linked order when using localStorage backend', async () => {
    mockKitchenFindById.mockResolvedValueOnce(ticket);
    mockOrdersFindById.mockResolvedValueOnce({
      id: 'order-1',
      delivery_type: 'pickup',
      scheduled_time: '2026-03-18T11:20:00.000Z',
      estimated_ready_at: null,
      metadata: null,
    });
    mockOrdersUpdate.mockResolvedValueOnce({});
    mockKitchenUpdate.mockResolvedValueOnce({
      ...ticket,
      estimated_ready_at: '2026-03-18T11:35:00.000Z',
    });

    await kitchenRepository.adjustPickupTime('ticket-1', '2026-03-18T11:35:00.000Z');

    expect(mockOrdersUpdate).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        estimated_ready_at: '2026-03-18T11:35:00.000Z',
        metadata: expect.objectContaining({
          pickup_time_adjustments: [
            expect.objectContaining({
              previous_time: '2026-03-18T11:20:00.000Z',
              new_time: '2026-03-18T11:35:00.000Z',
              source: 'kds',
            }),
          ],
        }),
      })
    );
    expect(mockKitchenUpdate).toHaveBeenCalledWith('ticket-1', {
      estimated_ready_at: '2026-03-18T11:35:00.000Z',
    });
  });
});
