import { describe, expect, it } from 'vitest';
import { OrderChannel, OrderSource, OrderStatus, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import {
  filterOrdersByDateRange,
  getOrderItemsCount,
  getOrderReportSummary,
  getPresetDateRange,
  normalizeDateRange,
} from '../report';

function createOrder(
  id: string,
  createdAt: string,
  total: number,
  itemQuantities: number[]
): Order {
  return {
    id,
    order_number: `ZAM-${id}`,
    status: OrderStatus.PENDING,
    channel: OrderChannel.POS,
    source: OrderSource.TAKEAWAY,
    location_id: 'loc-1',
    items: itemQuantities.map((quantity, index) => ({
      id: `${id}-${index}`,
      product_id: `prod-${index}`,
      product_name: `Produkt ${index}`,
      quantity,
      unit_price: total / Math.max(itemQuantities.length, 1),
      modifiers: [],
      subtotal: quantity * (total / Math.max(itemQuantities.length, 1)),
    })),
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

describe('orders report helpers', () => {
  it('builds preset ranges for current and previous periods', () => {
    const referenceDate = new Date(2026, 2, 17, 12, 0, 0);

    expect(getPresetDateRange('today', referenceDate)).toEqual({
      from: '2026-03-17',
      to: '2026-03-17',
    });

    expect(getPresetDateRange('this_week', referenceDate)).toEqual({
      from: '2026-03-16',
      to: '2026-03-22',
    });

    expect(getPresetDateRange('last_month', referenceDate)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('normalizes reversed ranges before filtering', () => {
    expect(normalizeDateRange('2026-03-20', '2026-03-10')).toEqual({
      from: '2026-03-10',
      to: '2026-03-20',
    });
  });

  it('filters orders by local date range inclusively', () => {
    const orders = [
      createOrder('1', '2026-03-09T23:30:00.000Z', 42, [2, 1]),
      createOrder('2', '2026-03-11T10:00:00.000Z', 35, [1]),
      createOrder('3', '2026-03-12T23:30:00.000Z', 18, [3]),
    ];

    const filtered = filterOrdersByDateRange(
      orders,
      {
        from: '2026-03-10',
        to: '2026-03-12',
      },
      'Europe/Warsaw'
    );

    expect(filtered.map((order) => order.id)).toEqual(['1', '2']);
  });

  it('counts items and totals for the visible report rows', () => {
    const orders = [
      createOrder('1', '2026-03-10T10:00:00.000Z', 42, [2, 1]),
      createOrder('2', '2026-03-11T10:00:00.000Z', 35, [4]),
    ];

    expect(getOrderItemsCount(orders[0])).toBe(3);
    expect(getOrderReportSummary(orders)).toEqual({
      itemsCount: 7,
      orderCount: 2,
      total: 77,
    });
  });
});
