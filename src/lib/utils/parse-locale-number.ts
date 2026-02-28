/**
 * Parse a locale-aware number string (supports comma as decimal separator).
 * "0,5" -> 0.5, "1.25" -> 1.25, "3,14" -> 3.14
 */
export function parseLocaleNumber(value: string): number {
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
