import { describe, expect, it } from 'vitest';
import { OrderStatus, OrderChannel, OrderSource, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import { getOrderStatsForLocalDay } from '../stats';

function createOrder(
  id: string,
  createdAt: string,
  total: number,
  status: OrderStatus
): Order {
  return {
    id,
    order_number: `ZAM-${id}`,
    status,
    channel: OrderChannel.POS,
    source: OrderSource.TAKEAWAY,
    location_id: 'loc-1',
    items: [],
    subtotal: total,
    tax: 0,
    discount: 0,
    total,
    payment_status: PaymentStatus.PENDING,
    status_history: [],
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe('order stats', () => {
  it('counts only orders from the same local day in the given timezone', () => {
    const orders = [
      createOrder('1', '2026-03-11T23:30:00.000Z', 42, OrderStatus.PENDING),
      createOrder('2', '2026-03-11T21:30:00.000Z', 35, OrderStatus.PENDING),
      createOrder('3', '2026-03-12T08:00:00.000Z', 25, OrderStatus.CANCELLED),
    ];

    const stats = getOrderStatsForLocalDay(
      orders,
      new Date('2026-03-12T00:15:00+01:00'),
      'Europe/Warsaw'
    );

    expect(stats.orderCountToday).toBe(2);
    expect(stats.revenueToday).toBe(42);
  });

  it('returns active order count from all loaded orders, not only todays orders', () => {
    const orders = [
      createOrder('1', '2026-03-12T08:00:00.000Z', 20, OrderStatus.PENDING),
      createOrder('2', '2026-03-10T08:00:00.000Z', 30, OrderStatus.ACCEPTED),
      createOrder('3', '2026-03-12T09:00:00.000Z', 40, OrderStatus.DELIVERED),
      createOrder('4', '2026-03-12T10:00:00.000Z', 50, OrderStatus.CANCELLED),
    ];

    const stats = getOrderStatsForLocalDay(
      orders,
      new Date('2026-03-12T12:00:00+01:00'),
      'Europe/Warsaw'
    );

    expect(stats.activeOrderCount).toBe(2);
    expect(stats.avgOrderValue).toBe(20);
  });
});
