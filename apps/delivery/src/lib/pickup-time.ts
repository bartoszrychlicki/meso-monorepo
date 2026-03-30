import { getLatestPickupTimeAdjustment } from '@meso/core';
import type { Locale } from '@meso/core';
import { format, isSameDay, addDays } from 'date-fns';
import { enGB, pl } from 'date-fns/locale';
import { readDeliveryLocaleCookie } from '@/lib/i18n/config';

interface PickupTimeOrderLike {
  delivery_type?: string | null;
  scheduled_time?: string | null;
  estimated_ready_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PickupTimeDetails {
  currentTime: string | null;
  previousTime: string | null;
  isAdjusted: boolean;
}

export function getPickupTimeDetails(order: PickupTimeOrderLike): PickupTimeDetails {
  if (order.delivery_type !== 'pickup') {
    return {
      currentTime: null,
      previousTime: null,
      isAdjusted: false,
    };
  }

  const currentTime = order.estimated_ready_at || order.scheduled_time || null;
  const latestAdjustment = getLatestPickupTimeAdjustment(order.metadata);

  return {
    currentTime,
    previousTime: latestAdjustment?.previous_time ?? null,
    isAdjusted: !!order.estimated_ready_at,
  };
}

export function formatCustomerPickupTime(
  dateString: string,
  referenceDate: Date = new Date(),
  locale: Locale = readDeliveryLocaleCookie()
): string | null {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dateLocale = locale === 'en' ? enGB : pl;

  if (isSameDay(date, referenceDate)) {
    return format(date, 'HH:mm', { locale: dateLocale });
  }

  if (isSameDay(date, addDays(referenceDate, 1))) {
    return locale === 'en'
      ? `tomorrow, ${format(date, 'HH:mm', { locale: dateLocale })}`
      : `jutro, ${format(date, 'HH:mm', { locale: dateLocale })}`;
  }

  return format(date, 'd MMM, HH:mm', { locale: dateLocale });
}
