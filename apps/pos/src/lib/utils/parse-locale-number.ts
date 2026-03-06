/**
 * Parse a locale-aware number string (supports comma as decimal separator).
 * "0,5" -> 0.5, "1.25" -> 1.25, "3,14" -> 3.14
 */
export function parseLocaleNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/\d/.test(normalized)) {
    return null;
  }
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatLocaleNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '';
  }

  return String(value).replace('.', ',');
}
