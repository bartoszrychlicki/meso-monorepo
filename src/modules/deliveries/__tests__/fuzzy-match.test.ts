import { describe, it, expect } from 'vitest';
import { findBestMatch, findBestSupplierMatch } from '../utils/fuzzy-match';

const stockItems = [
  { id: 'si-1', name: 'Wolowina mielona', sku: 'WOL-001' },
  { id: 'si-2', name: 'Bulka hamburgerowa', sku: 'BUL-001' },
  { id: 'si-3', name: 'Ser cheddar', sku: 'SER-001' },
  { id: 'si-4', name: 'Salatka mieszana', sku: 'SAL-001' },
];

describe('findBestMatch', () => {
  it('exact name match returns high confidence', () => {
    const result = findBestMatch('Wolowina mielona', stockItems);
    expect(result.candidate_id).toBe('si-1');
    expect(result.confidence).toBe(1);
  });

  it('exact SKU match returns confidence 1.0', () => {
    const result = findBestMatch('WOL-001', stockItems);
    expect(result.candidate_id).toBe('si-1');
    expect(result.confidence).toBe(1.0);
  });

  it('fuzzy name match works for similar names', () => {
    const result = findBestMatch('Wolowina miel. 80/20', stockItems);
    expect(result.candidate_id).toBe('si-1');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns null for completely unrelated name', () => {
    const result = findBestMatch('Komputer stacjonarny', stockItems);
    expect(result.candidate_id).toBeNull();
  });

  it('is case insensitive', () => {
    const result = findBestMatch('WOLOWINA MIELONA', stockItems);
    expect(result.candidate_id).toBe('si-1');
  });

  it('respects threshold parameter', () => {
    const result = findBestMatch('Wol miel', stockItems, 0.9);
    expect(result.candidate_id).toBeNull();
  });
});

describe('findBestSupplierMatch', () => {
  const suppliers = [
    { id: 'sup-1', name: 'Hurtownia ABC' },
    { id: 'sup-2', name: 'Ardo Polska' },
  ];

  it('matches similar supplier name', () => {
    const result = findBestSupplierMatch('Hurtownia ABC Sp. z o.o.', suppliers);
    expect(result.id).toBe('sup-1');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('returns null for unknown supplier', () => {
    const result = findBestSupplierMatch('Firma XYZ', suppliers);
    expect(result.id).toBeNull();
  });
});
