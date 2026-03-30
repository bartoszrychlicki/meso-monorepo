import { INTL_LOCALES, type Locale } from '@meso/core'
import { readDeliveryLocaleCookie } from '@/lib/i18n/config'

function resolveActiveLocale(locale?: Locale): Locale {
    return locale ?? readDeliveryLocaleCookie()
}

/**
 * Format price for display in PLN
 * Shows exact price with 2 decimal places for consistency
 * @param price - Price in PLN
 * @returns Formatted price string with "zł" suffix
 */
export function formatPrice(price: number, locale?: Locale): string {
    const activeLocale = resolveActiveLocale(locale)

    return new Intl.NumberFormat(INTL_LOCALES[activeLocale], {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price)
}

/**
 * Format signed price delta for display, e.g. +2,00 zł or -2,00 zł
 * Returns null for zero values so the caller can skip rendering it.
 */
export function formatPriceDelta(price: number, locale?: Locale): string | null {
    if (price === 0) return null

    const sign = price > 0 ? '+' : '-'
    return `${sign}${formatPrice(Math.abs(price), locale)}`
}

/**
 * Format price with decimals (for checkout/payment summaries)
 * @param price - Price in PLN
 * @returns Formatted price string with 2 decimal places and "zł" suffix
 */
export function formatPriceExact(price: number, locale?: Locale): string {
    return formatPrice(price, locale)
}
