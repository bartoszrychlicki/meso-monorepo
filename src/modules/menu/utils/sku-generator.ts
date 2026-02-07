/**
 * SKU Generator Utility
 * Generuje unikalne kody SKU dla produktów na podstawie kategorii
 */

/**
 * Generuje kod SKU na podstawie nazwy kategorii i indeksu
 * @param categoryName - Nazwa kategorii
 * @param index - Indeks produktu w kategorii (1-based)
 * @returns Kod SKU w formacie "XXX-001"
 *
 * @example
 * generateSKU("Burgery", 1) // "BUR-001"
 * generateSKU("Frytki i dodatki", 2) // "FRY-002"
 */
export function generateSKU(categoryName: string, index: number): string {
  // Pobierz pierwsze 3 litery kategorii i zamień na uppercase
  const prefix = categoryName
    .replace(/\s+/g, '') // usuń spacje
    .substring(0, 3)
    .toUpperCase();

  // Formatuj index z zerowaniem (001, 002, ..., 999)
  const paddedIndex = String(index).padStart(3, '0');

  return `${prefix}-${paddedIndex}`;
}

/**
 * Waliduje format SKU
 * @param sku - Kod SKU do walidacji
 * @returns true jeśli format jest poprawny
 *
 * @example
 * validateSKU("BUR-001") // true
 * validateSKU("INVALID") // false
 */
export function validateSKU(sku: string): boolean {
  // Format: 3 litery, myślnik, 3 cyfry
  const skuRegex = /^[A-Z]{3}-\d{3}$/;
  return skuRegex.test(sku);
}

/**
 * Parsuje SKU i zwraca prefix i numer
 * @param sku - Kod SKU do sparsowania
 * @returns Obiekt z prefix i number lub null jeśli niepoprawny format
 *
 * @example
 * parseSKU("BUR-001") // { prefix: "BUR", number: 1 }
 */
export function parseSKU(sku: string): { prefix: string; number: number } | null {
  if (!validateSKU(sku)) return null;

  const [prefix, numberStr] = sku.split('-');
  return {
    prefix,
    number: parseInt(numberStr, 10),
  };
}
