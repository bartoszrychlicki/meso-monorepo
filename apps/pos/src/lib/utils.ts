import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { enGB, pl } from "date-fns/locale"
import { INTL_LOCALES, type Locale } from '@meso/core'
import { readPosLocaleCookie } from '@/lib/i18n/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function resolveActiveLocale(locale?: Locale): Locale {
  return locale ?? readPosLocaleCookie()
}

const DATE_LOCALES = {
  pl,
  en: enGB,
} as const;

export function formatCurrency(amount: number, locale?: Locale): string {
  const activeLocale = resolveActiveLocale(locale);

  return new Intl.NumberFormat(INTL_LOCALES[activeLocale], {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, locale?: Locale): string {
  const activeLocale = resolveActiveLocale(locale);
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd MMMM yyyy', { locale: DATE_LOCALES[activeLocale] })
}

export function formatTime(date: string | Date, locale?: Locale): string {
  const activeLocale = resolveActiveLocale(locale);
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'HH:mm', { locale: DATE_LOCALES[activeLocale] })
}

export function formatDateTime(date: string | Date, locale?: Locale): string {
  const activeLocale = resolveActiveLocale(locale);
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd MMM yyyy, HH:mm', { locale: DATE_LOCALES[activeLocale] })
}
