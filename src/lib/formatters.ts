/**
 * Format price for display in PLN
 * Shows exact price with 2 decimal places for consistency
 * @param price - Price in PLN
 * @returns Formatted price string with "zł" suffix
 */
export function formatPrice(price: number): string {
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price) + ' zł'
}

/**
 * Format price with decimals (for checkout/payment summaries)
 * @param price - Price in PLN
 * @returns Formatted price string with 2 decimal places and "zł" suffix
 */
export function formatPriceExact(price: number): string {
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price) + ' zł'
}
