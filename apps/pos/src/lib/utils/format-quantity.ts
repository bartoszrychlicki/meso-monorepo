const DEFAULT_QUANTITY_PRECISION = 4;

export function normalizeQuantity(
  value: number,
  precision = DEFAULT_QUANTITY_PRECISION
): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const normalized = Number.parseFloat(value.toFixed(precision));
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function formatQuantity(
  value: number | null | undefined,
  precision = DEFAULT_QUANTITY_PRECISION
): string {
  if (value == null || Number.isNaN(value)) {
    return '';
  }

  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  }).format(normalizeQuantity(value, precision));
}
