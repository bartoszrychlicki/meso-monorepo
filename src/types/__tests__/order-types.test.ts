import { describe, it, expectTypeOf } from 'vitest'
import type { Order } from '../order'

describe('Order type', () => {
  it('accepts string UUIDs for id', () => {
    expectTypeOf<Order['id']>().toEqualTypeOf<string>()
  })

  it('has order_number field', () => {
    expectTypeOf<Order>().toHaveProperty('order_number')
  })
})
