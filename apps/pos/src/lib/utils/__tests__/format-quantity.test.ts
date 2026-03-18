import { describe, expect, it } from 'vitest';
import { formatQuantity, normalizeQuantity } from '../format-quantity';

describe('normalizeQuantity', () => {
  it('rounds floating point artifacts to warehouse precision', () => {
    expect(normalizeQuantity(0.2 - 0.15)).toBe(0.05);
    expect(normalizeQuantity(0.3 - 0.2)).toBe(0.1);
  });
});

describe('formatQuantity', () => {
  it('formats values with a comma and trims trailing zeros', () => {
    expect(formatQuantity(0.2 - 0.15)).toBe('0,05');
    expect(formatQuantity(12.5)).toBe('12,5');
    expect(formatQuantity(1.23456)).toBe('1,2346');
  });

  it('returns empty string for missing values', () => {
    expect(formatQuantity(null)).toBe('');
    expect(formatQuantity(undefined)).toBe('');
  });
});
