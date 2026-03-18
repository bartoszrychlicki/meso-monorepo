import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { Order } from '@/types/order';
import { getLocalDateKey } from './stats';

export type OrderDatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface OrderDateRange {
  from: string;
  to: string;
}

export interface OrderReportSummary {
  itemsCount: number;
  orderCount: number;
  total: number;
}

function formatDateInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getPresetDateRange(
  preset: Exclude<OrderDatePreset, 'custom'>,
  referenceDate = new Date()
): OrderDateRange {
  switch (preset) {
    case 'today': {
      const day = formatDateInput(referenceDate);
      return { from: day, to: day };
    }
    case 'yesterday': {
      const day = formatDateInput(subDays(referenceDate, 1));
      return { from: day, to: day };
    }
    case 'this_week':
      return {
        from: formatDateInput(startOfWeek(referenceDate, { weekStartsOn: 1 })),
        to: formatDateInput(endOfWeek(referenceDate, { weekStartsOn: 1 })),
      };
    case 'last_week': {
      const previousWeek = subWeeks(referenceDate, 1);
      return {
        from: formatDateInput(startOfWeek(previousWeek, { weekStartsOn: 1 })),
        to: formatDateInput(endOfWeek(previousWeek, { weekStartsOn: 1 })),
      };
    }
    case 'this_month':
      return {
        from: formatDateInput(startOfMonth(referenceDate)),
        to: formatDateInput(endOfMonth(referenceDate)),
      };
    case 'last_month': {
      const previousMonth = subMonths(referenceDate, 1);
      return {
        from: formatDateInput(startOfMonth(previousMonth)),
        to: formatDateInput(endOfMonth(previousMonth)),
      };
    }
    case 'this_year':
      return {
        from: formatDateInput(startOfYear(referenceDate)),
        to: formatDateInput(endOfYear(referenceDate)),
      };
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

export function normalizeDateRange(from: string, to: string): OrderDateRange {
  if (from && to && from > to) {
    return { from: to, to: from };
  }

  return { from, to };
}

export function filterOrdersByDateRange(
  orders: Order[],
  range: OrderDateRange,
  timeZone?: string
): Order[] {
  const normalizedRange = normalizeDateRange(range.from, range.to);

  if (!normalizedRange.from && !normalizedRange.to) {
    return orders;
  }

  return orders.filter((order) => {
    const dateKey = getLocalDateKey(order.created_at, timeZone);

    if (normalizedRange.from && dateKey < normalizedRange.from) {
      return false;
    }

    if (normalizedRange.to && dateKey > normalizedRange.to) {
      return false;
    }

    return true;
  });
}

export function getOrderItemsCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getOrderReportSummary(orders: Order[]): OrderReportSummary {
  return {
    itemsCount: orders.reduce((sum, order) => sum + getOrderItemsCount(order), 0),
    orderCount: orders.length,
    total: orders.reduce((sum, order) => sum + order.total, 0),
  };
}
