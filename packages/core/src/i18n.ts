export const SUPPORTED_LOCALES = ['pl', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pl';

export const INTL_LOCALES: Record<Locale, string> = {
  pl: 'pl-PL',
  en: 'en-GB',
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === 'pl' || value === 'en';
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase().replace('_', '-');
  const primary = normalized.split('-')[0];

  if (isSupportedLocale(normalized)) return normalized;
  if (isSupportedLocale(primary)) return primary;

  return null;
}

export function resolveLocale(
  ...candidates: Array<string | null | undefined>
): Locale {
  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_LOCALE;
}
