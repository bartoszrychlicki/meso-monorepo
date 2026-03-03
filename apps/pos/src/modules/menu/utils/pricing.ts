/**
 * Pricing Utility
 * Funkcje pomocnicze do zarządzania cenami wielokanałowymi
 */

import { Product, ProductPricing } from '@/types/menu';
import { SalesChannel } from '@/types/enums';

export interface ProductPromotionPricing {
  currentPrice: number;
  originalPrice?: number;
  isPromotionActive: boolean;
  promoLabel?: string;
}

/**
 * Pobiera cenę dla konkretnego kanału sprzedaży
 * @param product - Produkt
 * @param channel - Kanał sprzedaży
 * @returns Cena dla kanału lub cena bazowa jako fallback
 */
export function getPriceForChannel(
  product: Product,
  channel: SalesChannel
): number {
  const pricing = product.pricing.find((p) => p.channel === channel);
  return pricing?.price ?? product.price;
}

/**
 * Pobiera najniższą cenę ze wszystkich kanałów
 * @param product - Produkt
 * @returns Najniższa cena
 */
export function getLowestPrice(product: Product): number {
  if (product.pricing.length === 0) return product.price;
  return Math.min(...product.pricing.map((p) => p.price));
}

/**
 * Pobiera najwyższą cenę ze wszystkich kanałów
 * @param product - Produkt
 * @returns Najwyższa cena
 */
export function getHighestPrice(product: Product): number {
  if (product.pricing.length === 0) return product.price;
  return Math.max(...product.pricing.map((p) => p.price));
}

/**
 * Pobiera zakres cen (min-max) dla wyświetlania
 * @param product - Produkt
 * @returns String w formacie "od X PLN" lub "X - Y PLN" lub "X PLN"
 */
export function getPriceRangeDisplay(product: Product): string {
  if (product.pricing.length === 0) {
    return `${product.price.toFixed(2)} PLN`;
  }

  const lowest = getLowestPrice(product);
  const highest = getHighestPrice(product);

  if (lowest === highest) {
    return `${lowest.toFixed(2)} PLN`;
  }

  return `${lowest.toFixed(2)} - ${highest.toFixed(2)} PLN`;
}

/**
 * Sprawdza czy produkt ma różne ceny dla różnych kanałów
 * @param product - Produkt
 * @returns true jeśli ceny są różne
 */
export function hasMultiplePrices(product: Product): boolean {
  if (product.pricing.length === 0) return false;
  const lowest = getLowestPrice(product);
  const highest = getHighestPrice(product);
  return lowest !== highest;
}

/**
 * Tworzy domyślne ceny dla wszystkich kanałów na podstawie ceny bazowej
 * @param basePrice - Cena bazowa
 * @param pickupDiscount - Opcjonalna zniżka dla odbioru (domyślnie 2 PLN)
 * @returns Array ProductPricing dla wszystkich kanałów
 */
export function createDefaultPricing(
  basePrice: number,
  pickupDiscount: number = 2
): ProductPricing[] {
  return [
    { channel: SalesChannel.DELIVERY, price: basePrice },
    { channel: SalesChannel.PICKUP, price: Math.max(0, basePrice - pickupDiscount) },
    { channel: SalesChannel.EAT_IN, price: basePrice },
  ];
}

/**
 * Pobiera label dla kanału sprzedaży (do wyświetlania w UI)
 * @param channel - Kanał sprzedaży
 * @returns Polski label
 */
export function getChannelLabel(channel: SalesChannel): string {
  const labels: Record<SalesChannel, string> = {
    [SalesChannel.DELIVERY]: 'Dostawa',
    [SalesChannel.PICKUP]: 'Odbiór',
    [SalesChannel.EAT_IN]: 'Na miejscu',
  };
  return labels[channel];
}

export function isProductPromotionActive(
  product: Product | null | undefined,
  now: Date = new Date()
): boolean {
  if (!product) return false;
  if (product.original_price == null) return false;
  if (product.original_price <= product.price) return false;

  if (product.promo_starts_at) {
    const start = new Date(product.promo_starts_at);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }

  if (product.promo_ends_at) {
    const end = new Date(product.promo_ends_at);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }

  return true;
}

export function getProductPromotionPricing(
  product: Product | null | undefined,
  now: Date = new Date()
): ProductPromotionPricing {
  if (!product) {
    return {
      currentPrice: 0,
      isPromotionActive: false,
    };
  }

  const hasDiscountPrice = product.original_price != null && product.original_price > product.price;
  if (!hasDiscountPrice) {
    return {
      currentPrice: product.price,
      isPromotionActive: false,
    };
  }

  const isPromotionActive = isProductPromotionActive(product, now);
  if (!isPromotionActive) {
    return {
      currentPrice: product.original_price as number,
      isPromotionActive: false,
    };
  }

  return {
    currentPrice: product.price,
    originalPrice: product.original_price ?? undefined,
    isPromotionActive: true,
    promoLabel: product.promo_label?.trim() || undefined,
  };
}
