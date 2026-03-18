import { Order } from '@/types/order';
import { OrderStatus } from '@/types/enums';

function getResolvedTimeZone(timeZone?: string): string {
  return timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

function getDatePart(
  parts: Intl.DateTimeFormatPart[],
  type: 'year' | 'month' | 'day'
): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function getLocalDateKey(
  value: string | Date,
  timeZone?: string
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: getResolvedTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);

  return [
    getDatePart(parts, 'year'),
    getDatePart(parts, 'month'),
    getDatePart(parts, 'day'),
  ].join('-');
}

export function getOrdersForLocalDay(
  orders: Order[],
  referenceDate: Date = new Date(),
  timeZone?: string
): Order[] {
  const todayKey = getLocalDateKey(referenceDate, timeZone);
  return orders.filter(
    (order) => getLocalDateKey(order.created_at, timeZone) === todayKey
  );
}

export function filterOutCancelledOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status !== OrderStatus.CANCELLED);
}

export function getCancelledOrderCount(orders: Order[]): number {
  return orders.filter((order) => order.status === OrderStatus.CANCELLED).length;
}

export function getRevenueForOrders(orders: Order[]): number {
  return filterOutCancelledOrders(orders).reduce((sum, order) => sum + order.total, 0);
}

export function getActiveOrderCount(orders: Order[]): number {
  return orders.filter(
    (order) =>
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.CANCELLED
  ).length;
}

export function getOrderStatsForLocalDay(
  orders: Order[],
  referenceDate: Date = new Date(),
  timeZone?: string
) {
  const todaysOrders = getOrdersForLocalDay(orders, referenceDate, timeZone);
  const todaysNonCancelledOrders = filterOutCancelledOrders(todaysOrders);
  const revenueToday = getRevenueForOrders(todaysNonCancelledOrders);
  const orderCountToday = todaysNonCancelledOrders.length;

  return {
    todaysOrders,
    todaysNonCancelledOrders,
    revenueToday,
    orderCountToday,
    cancelledOrderCountToday: getCancelledOrderCount(todaysOrders),
    avgOrderValue: orderCountToday > 0 ? revenueToday / orderCountToday : 0,
    activeOrderCount: getActiveOrderCount(orders),
  };
}
