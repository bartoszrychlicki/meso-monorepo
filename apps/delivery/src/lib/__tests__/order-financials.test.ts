import { describe, expect, it } from 'vitest'
import {
  readNumberLike,
  readOrderDeliveryFee,
  readOrderDiscount,
  readOrderPaymentFee,
} from '../order-financials'

describe('order-financials helpers', () => {
  it('prefers canonical discount over legacy promo_discount', () => {
    expect(
      readOrderDiscount({
        discount: 12,
        promo_discount: 5,
      })
    ).toBe(12)
  })

  it('falls back to legacy promo_discount when discount is missing', () => {
    expect(
      readOrderDiscount({
        promo_discount: 7.5,
      })
    ).toBe(7.5)
  })

  it('reads payment fee from metadata only', () => {
    expect(
      readOrderPaymentFee({
        metadata: {
          payment_fee: '2.5',
        },
      })
    ).toBe(2.5)
    expect(
      readOrderPaymentFee({
        metadata: undefined,
      })
    ).toBe(0)
  })

  it('normalizes numeric-like values safely', () => {
    expect(readNumberLike('4.25')).toBe(4.25)
    expect(readOrderDeliveryFee({ delivery_fee: '7.99' })).toBe(7.99)
    expect(readNumberLike('abc')).toBe(0)
  })
})
