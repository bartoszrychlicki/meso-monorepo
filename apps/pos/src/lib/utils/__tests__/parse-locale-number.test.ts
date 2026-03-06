import { describe, expect, it } from 'vitest';
import {
  formatLocaleNumber,
  parseLocaleNumber,
} from '../parse-locale-number';

describe('parseLocaleNumber', () => {
  it('parses comma-separated decimals', () => {
    expect(parseLocaleNumber('1,5')).toBe(1.5);
  });

  it('parses dot-separated decimals', () => {
    expect(parseLocaleNumber('1.5')).toBe(1.5);
  });

  it('accepts intermediate zero states', () => {
    expect(parseLocaleNumber('0,')).toBe(0);
    expect(parseLocaleNumber('0.')).toBe(0);
  });

  it('returns null for empty values', () => {
    expect(parseLocaleNumber('')).toBeNull();
    expect(parseLocaleNumber('   ')).toBeNull();
  });
});

describe('formatLocaleNumber', () => {
  it('formats decimals with a comma', () => {
    expect(formatLocaleNumber(1.5)).toBe('1,5');
  });

  it('returns an empty string for missing values', () => {
    expect(formatLocaleNumber(null)).toBe('');
    expect(formatLocaleNumber(undefined)).toBe('');
  });
});
