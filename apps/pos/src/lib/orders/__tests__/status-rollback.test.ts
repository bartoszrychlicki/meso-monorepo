import { describe, expect, it } from 'vitest';
import {
  buildRollbackLifecycleTimestampPatch,
  getRollbackResolution,
  getRollbackTargetStatus,
} from '../status-rollback';
import { OrderStatus } from '@/types/enums';
import type { Order } from '@/types/order';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    order_number: 'WEB-1',
    status: OrderStatus.PREPARING,
    channel: 'delivery_app' as Order['channel'],
    source: 'delivery' as Order['source'],
    location_id: 'loc-1',
    items: [],
    subtotal: 10,
    tax: 1,
    discount: 0,
    total: 11,
    payment_status: 'pending' as Order['payment_status'],
    status_history: [
      { status: OrderStatus.PENDING, timestamp: '2026-03-15T10:00:00.000Z' },
      { status: OrderStatus.CONFIRMED, timestamp: '2026-03-15T10:01:00.000Z' },
      { status: OrderStatus.ACCEPTED, timestamp: '2026-03-15T10:02:00.000Z' },
      { status: OrderStatus.PREPARING, timestamp: '2026-03-15T10:03:00.000Z' },
    ],
    created_at: '2026-03-15T10:00:00.000Z',
    updated_at: '2026-03-15T10:03:00.000Z',
    ...overrides,
  };
}

describe('status rollback helpers', () => {
  it('returns the previous status from history as rollback target', () => {
    const targetStatus = getRollbackTargetStatus(
      makeOrder({
        status: OrderStatus.READY,
        status_history: [
          { status: OrderStatus.PENDING, timestamp: '2026-03-15T10:00:00.000Z' },
          { status: OrderStatus.CONFIRMED, timestamp: '2026-03-15T10:01:00.000Z' },
          { status: OrderStatus.ACCEPTED, timestamp: '2026-03-15T10:02:00.000Z' },
          { status: OrderStatus.PREPARING, timestamp: '2026-03-15T10:03:00.000Z' },
          { status: OrderStatus.READY, timestamp: '2026-03-15T10:04:00.000Z' },
        ],
      })
    );

    expect(targetStatus).toBe(OrderStatus.PREPARING);
  });

  it('supports undoing the last rollback by using the latest current-status entry', () => {
    const targetStatus = getRollbackTargetStatus(
      makeOrder({
        status: OrderStatus.PREPARING,
        status_history: [
          { status: OrderStatus.PENDING, timestamp: '2026-03-15T10:00:00.000Z' },
          { status: OrderStatus.CONFIRMED, timestamp: '2026-03-15T10:01:00.000Z' },
          { status: OrderStatus.ACCEPTED, timestamp: '2026-03-15T10:02:00.000Z' },
          { status: OrderStatus.PREPARING, timestamp: '2026-03-15T10:03:00.000Z' },
          { status: OrderStatus.READY, timestamp: '2026-03-15T10:04:00.000Z' },
          { status: OrderStatus.PREPARING, timestamp: '2026-03-15T10:05:00.000Z', note: 'rollback' },
        ],
      })
    );

    expect(targetStatus).toBe(OrderStatus.READY);
  });

  it('blocks rollback for terminal statuses', () => {
    const resolution = getRollbackResolution(
      makeOrder({
        status: OrderStatus.DELIVERED,
        status_history: [
          { status: OrderStatus.PENDING, timestamp: '2026-03-15T10:00:00.000Z' },
          { status: OrderStatus.READY, timestamp: '2026-03-15T10:01:00.000Z' },
          { status: OrderStatus.DELIVERED, timestamp: '2026-03-15T10:02:00.000Z' },
        ],
      })
    );

    expect(resolution.canRollback).toBe(false);
    expect(resolution.reason).toBe('terminal_status');
  });

  it('blocks rollback when history is missing the current status entry', () => {
    const resolution = getRollbackResolution(
      makeOrder({
        status: OrderStatus.READY,
        status_history: [
          { status: OrderStatus.PENDING, timestamp: '2026-03-15T10:00:00.000Z' },
          { status: OrderStatus.PREPARING, timestamp: '2026-03-15T10:03:00.000Z' },
        ],
      })
    );

    expect(resolution.canRollback).toBe(false);
    expect(resolution.reason).toBe('invalid_history');
  });

  it('blocks rollback when the previous status is terminal', () => {
    const resolution = getRollbackResolution(
      makeOrder({
        status: OrderStatus.PREPARING,
        status_history: [
          { status: OrderStatus.PENDING, timestamp: '2026-03-15T10:00:00.000Z' },
          { status: OrderStatus.CANCELLED, timestamp: '2026-03-15T10:01:00.000Z' },
          { status: OrderStatus.PREPARING, timestamp: '2026-03-15T10:02:00.000Z' },
        ],
      })
    );

    expect(resolution.canRollback).toBe(false);
    expect(resolution.reason).toBe('terminal_target');
  });

  it('clears only timestamps that are later than the rollback target', () => {
    expect(buildRollbackLifecycleTimestampPatch(OrderStatus.PREPARING)).toEqual({
      ready_at: null,
      picked_up_at: null,
      delivered_at: null,
      cancelled_at: null,
    });

    expect(buildRollbackLifecycleTimestampPatch(OrderStatus.PENDING)).toEqual({
      confirmed_at: null,
      preparing_at: null,
      ready_at: null,
      picked_up_at: null,
      delivered_at: null,
      cancelled_at: null,
    });
  });
});
