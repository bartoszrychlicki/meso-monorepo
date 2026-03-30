import { DEFAULT_LOCALE, type Locale, resolveLocale } from '@meso/core';

export const POS_LOCALE_COOKIE = 'meso-pos-locale';

export function resolvePosLocale(...candidates: Array<string | null | undefined>): Locale {
  return resolveLocale(...candidates);
}

export function readPosLocaleCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;

  const rawCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${POS_LOCALE_COOKIE}=`))
    ?.split('=')[1];

  return resolvePosLocale(rawCookie);
}

export function writePosLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${POS_LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
