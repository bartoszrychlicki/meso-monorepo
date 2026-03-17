import { describe, expect, it } from 'vitest';
import {
  syncProductModifierGroups,
  type ProductModifierLink,
  type SyncedMenuModifier,
} from '../menu-modifier-groups';

type TestModifier = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  modifier_action: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TestProduct = {
  id: string;
  modifier_groups: Array<{
    id: string;
    name: string;
    modifiers: TestModifier[];
  }>;
};

const now = '2026-03-15T10:00:00.000Z';

function makeProduct(): TestProduct {
  return {
    id: 'product-1',
    modifier_groups: [
      {
        id: 'group-1',
        name: 'Dodatki',
        modifiers: [
          {
            id: 'mod-1',
            name: 'Stary ser',
            price: 3,
            is_available: true,
            modifier_action: 'add',
            sort_order: 0,
            created_at: now,
            updated_at: now,
          },
          {
            id: 'mod-2',
            name: 'Bekon',
            price: 5,
            is_available: true,
            modifier_action: 'add',
            sort_order: 1,
            created_at: now,
            updated_at: now,
          },
        ],
      },
    ],
  };
}

describe('syncProductModifierGroups', () => {
  it('updates embedded modifier fields from standalone modifiers', () => {
    const products = [makeProduct()];
    const links: ProductModifierLink[] = [
      { product_id: 'product-1', modifier_id: 'mod-1', sort_order: 1 },
      { product_id: 'product-1', modifier_id: 'mod-2', sort_order: 0 },
    ];
    const modifiers: SyncedMenuModifier[] = [
      {
        id: 'mod-1',
        name: 'Cheddar',
        price: 4,
        is_available: false,
        modifier_action: 'add',
        sort_order: 4,
      },
      {
        id: 'mod-2',
        name: 'Bekon premium',
        price: 6,
        is_available: true,
        modifier_action: 'add',
        sort_order: 3,
      },
    ];

    const [synced] = syncProductModifierGroups(products, links, modifiers);

    expect(synced.modifier_groups[0].modifiers).toEqual([
      expect.objectContaining({
        id: 'mod-2',
        name: 'Bekon premium',
        price: 6,
        is_available: true,
        sort_order: 0,
      }),
      expect.objectContaining({
        id: 'mod-1',
        name: 'Cheddar',
        price: 4,
        is_available: false,
        sort_order: 1,
      }),
    ]);
  });

  it('drops modifiers that are no longer linked to the product', () => {
    const products = [makeProduct()];
    const links: ProductModifierLink[] = [
      { product_id: 'product-1', modifier_id: 'mod-2', sort_order: 0 },
    ];
    const modifiers: SyncedMenuModifier[] = [
      {
        id: 'mod-1',
        name: 'Cheddar',
        price: 4,
        is_available: false,
        modifier_action: 'add',
        sort_order: 4,
      },
      {
        id: 'mod-2',
        name: 'Bekon premium',
        price: 6,
        is_available: true,
        modifier_action: 'add',
        sort_order: 3,
      },
    ];

    const [synced] = syncProductModifierGroups(products, links, modifiers);

    expect(synced.modifier_groups[0].modifiers).toHaveLength(1);
    expect(synced.modifier_groups[0].modifiers[0].id).toBe('mod-2');
  });

  it('keeps legacy modifiers when product links are unavailable', () => {
    const products = [makeProduct()];
    const modifiers: SyncedMenuModifier[] = [
      {
        id: 'mod-1',
        name: 'Cheddar',
        price: 4,
        is_available: false,
        modifier_action: 'add',
        sort_order: 4,
      },
    ];

    const [synced] = syncProductModifierGroups(products, [], modifiers);

    expect(synced.modifier_groups[0].modifiers).toEqual([
      expect.objectContaining({
        id: 'mod-1',
        name: 'Cheddar',
        price: 4,
        is_available: false,
      }),
      expect.objectContaining({
        id: 'mod-2',
        name: 'Bekon',
        price: 5,
        is_available: true,
      }),
    ]);
  });
});
