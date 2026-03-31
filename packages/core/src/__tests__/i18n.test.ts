import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, normalizeLocale, resolveLocale } from '../i18n';

describe('i18n locale helpers', () => {
  it('normalizes supported locale values', () => {
    expect(normalizeLocale('pl')).toBe('pl');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('EN_us')).toBe('en');
  });

  it('falls back to default locale when no candidate matches', () => {
    expect(resolveLocale(undefined, null, 'de-DE')).toBe(DEFAULT_LOCALE);
  });

  it('prefers the first supported candidate', () => {
    expect(resolveLocale('de-DE', 'en-US', 'pl-PL')).toBe('en');
  });
});
