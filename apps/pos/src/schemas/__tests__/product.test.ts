import { describe, expect, it } from 'vitest';
import { CreateProductSchema, UpdateProductSchema } from '@/schemas/menu';
import { ProductType, SalesChannel } from '@/types/enums';

const baseProduct = {
  name: 'Ramen Shoyu',
  slug: 'ramen-shoyu',
  category_id: '11111111-1111-1111-1111-111111111111',
  type: ProductType.SINGLE,
  price: 42,
  sku: 'RAM-001',
  tax_rate: 8,
  point_ids: [],
  pricing: [{ channel: SalesChannel.DELIVERY, price: 42 }],
};

describe('Product schemas', () => {
  it('sets is_hidden_in_menu to false by default when creating a product', () => {
    const result = CreateProductSchema.parse(baseProduct);

    expect(result.is_hidden_in_menu).toBe(false);
    expect(result.is_available).toBe(true);
  });

  it('accepts explicit is_hidden_in_menu in product updates', () => {
    const result = UpdateProductSchema.parse({
      is_available: false,
      is_hidden_in_menu: true,
    });

    expect(result).toMatchObject({
      is_available: false,
      is_hidden_in_menu: true,
    });
  });
});
