import { describe, expect, it } from 'vitest';
import { ModifierAction, OrderStatus } from '@/types/enums';
import type { KitchenItem } from '@/types/kitchen';
import type { OrderItem } from '@/types/order';
import {
  buildKitchenItemsFromOrderItems,
  buildKitchenTicketStatusPatch,
  haveOrderItemsChanged,
} from '../order-editing';

const baseOrderItem: OrderItem = {
  id: 'item-1',
  product_id: 'prod-1',
  product_name: 'Ramen',
  quantity: 1,
  unit_price: 32,
  subtotal: 32,
  modifiers: [
    {
      modifier_id: 'mod-1',
      name: 'Extra Chashu',
      price: 8,
      quantity: 1,
      modifier_action: ModifierAction.ADD,
    },
  ],
};

describe('haveOrderItemsChanged', () => {
  it('returns false for equivalent items', () => {
    expect(haveOrderItemsChanged([baseOrderItem], [{ ...baseOrderItem }])).toBe(false);
  });

  it('returns true when quantity changes', () => {
    expect(
      haveOrderItemsChanged([baseOrderItem], [{ ...baseOrderItem, quantity: 2, subtotal: 64 }])
    ).toBe(true);
  });
});

describe('buildKitchenItemsFromOrderItems', () => {
  it('preserves completion state for unchanged items', () => {
    const previousKitchenItems: KitchenItem[] = [
      {
        id: 'k-item-1',
        order_item_id: 'item-1',
        product_name: 'Ramen',
        quantity: 1,
        modifiers: ['Extra Chashu'],
        is_done: true,
      },
    ];

    const nextItems = buildKitchenItemsFromOrderItems([baseOrderItem], previousKitchenItems);

    expect(nextItems[0]).toMatchObject({
      id: 'k-item-1',
      order_item_id: 'item-1',
      is_done: true,
    });
  });

  it('resets completion state for changed items and adds new lines', () => {
    const previousKitchenItems: KitchenItem[] = [
      {
        id: 'k-item-1',
        order_item_id: 'item-1',
        product_name: 'Ramen',
        quantity: 1,
        modifiers: ['Extra Chashu'],
        is_done: true,
      },
    ];

    const nextItems = buildKitchenItemsFromOrderItems(
      [
        { ...baseOrderItem, quantity: 2, subtotal: 64 },
        {
          id: 'item-2',
          product_id: 'prod-2',
          product_name: 'Gyoza',
          quantity: 1,
          unit_price: 18,
          subtotal: 18,
          modifiers: [],
        },
      ],
      previousKitchenItems
    );

    expect(nextItems[0]).toMatchObject({
      id: 'k-item-1',
      order_item_id: 'item-1',
      is_done: false,
    });
    expect(nextItems[1]).toMatchObject({
      order_item_id: 'item-2',
      product_name: 'Gyoza',
      is_done: false,
    });
  });

  it('resets completion state for unchanged items when rollback requires re-review', () => {
    const previousKitchenItems: KitchenItem[] = [
      {
        id: 'k-item-1',
        order_item_id: 'item-1',
        product_name: 'Ramen',
        quantity: 1,
        modifiers: ['Extra Chashu'],
        is_done: true,
      },
    ];

    const nextItems = buildKitchenItemsFromOrderItems(
      [baseOrderItem],
      previousKitchenItems,
      { resetCompletionState: true }
    );

    expect(nextItems[0]).toMatchObject({
      id: 'k-item-1',
      order_item_id: 'item-1',
      is_done: false,
    });
  });

  it('preserves completion state when only notes change', () => {
    const previousKitchenItems: KitchenItem[] = [
      {
        id: 'k-item-1',
        order_item_id: 'item-1',
        product_name: 'Ramen',
        quantity: 1,
        modifiers: ['Extra Chashu'],
        notes: 'Bez sezamu',
        is_done: true,
      },
    ];

    const nextItems = buildKitchenItemsFromOrderItems(
      [{ ...baseOrderItem, notes: 'Dodatkowy bulion' }],
      previousKitchenItems
    );

    expect(nextItems[0]).toMatchObject({
      id: 'k-item-1',
      order_item_id: 'item-1',
      notes: 'Dodatkowy bulion',
      is_done: true,
    });
  });
});

describe('buildKitchenTicketStatusPatch', () => {
  it('maps READY edits back to preparing ticket state when requested upstream', () => {
    expect(buildKitchenTicketStatusPatch(OrderStatus.PREPARING)).toEqual({
      status: OrderStatus.PREPARING,
      completed_at: null,
    });
  });
});
