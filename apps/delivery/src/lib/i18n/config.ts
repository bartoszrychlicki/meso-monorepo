import { DEFAULT_LOCALE, type Locale, resolveLocale } from '@meso/core';

export const DELIVERY_LOCALE_COOKIE = 'meso-delivery-locale';

export function resolveDeliveryLocale(
  ...candidates: Array<string | null | undefined>
): Locale {
  return resolveLocale(...candidates);
}

export function readDeliveryLocaleCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;

  const rawCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${DELIVERY_LOCALE_COOKIE}=`))
    ?.split('=')[1];

  return resolveDeliveryLocale(rawCookie);
}

export function writeDeliveryLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${DELIVERY_LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
