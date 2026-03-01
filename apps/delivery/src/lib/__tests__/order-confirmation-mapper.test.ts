import { describe, expect, it } from 'vitest'
import { mapConfirmationItems } from '../order-confirmation-mapper'

describe('mapConfirmationItems', () => {
  it('maps inline JSON items from orders_orders.items first', () => {
    const items = mapConfirmationItems({
      items: [
        {
          id: 'i1',
          product_id: 'p1',
          product_name: 'Ramen Miso',
          unit_price: 42,
          quantity: 2,
          variant_name: 'Duza porcja',
          modifiers: [
            { modifier_id: 'm1', name: 'Jajko', price: 4, quantity: 1 },
          ],
        },
      ],
      order_items: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Ramen Miso')
    expect(items[0].quantity).toBe(2)
    expect(items[0].addons).toEqual([{ id: 'm1', name: 'Jajko', price: 4 }])
  })

  it('falls back to relation items when inline items are empty', () => {
    const items = mapConfirmationItems({
      items: [],
      order_items: [
        {
          id: 'oi-1',
          product_id: 'p2',
          unit_price: 19,
          quantity: 1,
          addons: [{ id: 'a1', name: 'Szczypiorek', price: 2 }],
          product: { name: 'Gyoza' },
        },
      ],
    })

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('oi-1')
    expect(items[0].name).toBe('Gyoza')
    expect(items[0].addons).toEqual([{ id: 'a1', name: 'Szczypiorek', price: 2 }])
  })

  it('converts modifier quantity into addon price used by UI total formula', () => {
    const items = mapConfirmationItems({
      items: [
        {
          id: 'i2',
          product_id: 'p3',
          product_name: 'Bao',
          unit_price: 10,
          quantity: 1,
          modifiers: [{ modifier_id: 'm2', name: 'Sos', price: 1.5, quantity: 3 }],
        },
      ],
    })

    expect(items[0].addons).toEqual([{ id: 'm2', name: 'Sos', price: 4.5 }])
  })
})
