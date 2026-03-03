import { describe, expect, it } from 'vitest';
import { Product } from '@/types/menu';
import { ProductType } from '@/types/enums';
import { getProductPromotionPricing, isProductPromotionActive } from '../pricing';

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Ramen',
    slug: 'ramen',
    description: 'Test product',
    category_id: 'cat-1',
    type: ProductType.SINGLE,
    price: 32,
    image_url: undefined,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    nutritional_info: undefined,
    variants: [],
    modifier_groups: [],
    ingredients: [],
    recipe_id: undefined,
    preparation_time_minutes: 10,
    sort_order: 1,
    color: undefined,
    sku: 'RAM-001',
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
    active_promotions: [],
    created_at: '2026-03-03T00:00:00.000Z',
    updated_at: '2026-03-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('promotion pricing', () => {
  it('returns base price when promotion is not configured', () => {
    const product = createProduct();
    const pricing = getProductPromotionPricing(product);

    expect(pricing.currentPrice).toBe(32);
    expect(pricing.isPromotionActive).toBe(false);
    expect(pricing.originalPrice).toBeUndefined();
  });

  it('activates promotion without time window', () => {
    const product = createProduct({
      price: 24,
      original_price: 32,
      promo_label: 'Happy Hour',
    });

    const pricing = getProductPromotionPricing(product);

    expect(pricing.currentPrice).toBe(24);
    expect(pricing.originalPrice).toBe(32);
    expect(pricing.isPromotionActive).toBe(true);
    expect(pricing.promoLabel).toBe('Happy Hour');
  });

  it('falls back to original price when promotion starts in the future', () => {
    const now = new Date('2026-03-03T10:00:00.000Z');
    const product = createProduct({
      price: 24,
      original_price: 32,
      promo_starts_at: '2026-03-03T12:00:00.000Z',
      promo_ends_at: '2026-03-03T20:00:00.000Z',
    });

    expect(isProductPromotionActive(product, now)).toBe(false);
    expect(getProductPromotionPricing(product, now)).toEqual({
      currentPrice: 32,
      isPromotionActive: false,
    });
  });

  it('falls back to original price when promotion is expired', () => {
    const now = new Date('2026-03-03T21:00:00.000Z');
    const product = createProduct({
      price: 24,
      original_price: 32,
      promo_starts_at: '2026-03-03T12:00:00.000Z',
      promo_ends_at: '2026-03-03T20:00:00.000Z',
    });

    expect(isProductPromotionActive(product, now)).toBe(false);
    expect(getProductPromotionPricing(product, now)).toEqual({
      currentPrice: 32,
      isPromotionActive: false,
    });
  });

  it('keeps promotion active inside time window', () => {
    const now = new Date('2026-03-03T13:00:00.000Z');
    const product = createProduct({
      price: 24,
      original_price: 32,
      promo_label: '-25%',
      promo_starts_at: '2026-03-03T12:00:00.000Z',
      promo_ends_at: '2026-03-03T20:00:00.000Z',
    });

    expect(isProductPromotionActive(product, now)).toBe(true);
    expect(getProductPromotionPricing(product, now)).toEqual({
      currentPrice: 24,
      originalPrice: 32,
      isPromotionActive: true,
      promoLabel: '-25%',
    });
  });
});
