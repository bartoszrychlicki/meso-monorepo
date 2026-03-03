import { describe, expect, it } from 'vitest'
import { resolveCartLocationConfig, resolveCheckoutConfig } from '@/lib/location-config'

describe('resolveCheckoutConfig', () => {
  it('maps values from orders_delivery_config', () => {
    const result = resolveCheckoutConfig({
      opening_time: '09:00:00',
      closing_time: '21:30:00',
      pickup_time_min: 25,
      pickup_buffer_after_open: 10,
      pickup_buffer_before_close: 5,
      pay_on_pickup_enabled: false,
      pay_on_pickup_fee: 3.5,
      pay_on_pickup_max_order: 150,
    })

    expect(result).toEqual({
      openTime: '09:00:00',
      closeTime: '21:30:00',
      pickupBufferAfterOpen: 10,
      pickupBufferBeforeClose: 5,
      pickupEstimateMinutes: 25,
      payOnPickupEnabled: false,
      payOnPickupFee: 3.5,
      payOnPickupMaxOrder: 150,
    })
  })

  it('falls back to estimated delivery minutes when pickup_time_min is missing', () => {
    const result = resolveCheckoutConfig({
      estimated_delivery_minutes: 35,
    })

    expect(result.pickupEstimateMinutes).toBe(35)
  })

  it('returns defaults when config is missing', () => {
    const result = resolveCheckoutConfig(null)

    expect(result).toEqual({
      openTime: '11:00',
      closeTime: '22:00',
      pickupBufferAfterOpen: 30,
      pickupBufferBeforeClose: 30,
      pickupEstimateMinutes: 20,
      payOnPickupEnabled: true,
      payOnPickupFee: 2,
      payOnPickupMaxOrder: 100,
    })
  })

  it('falls back to default pay-on-pickup max order when config value is non-positive', () => {
    const result = resolveCheckoutConfig({
      pay_on_pickup_enabled: true,
      pay_on_pickup_max_order: 0,
    })

    expect(result.payOnPickupMaxOrder).toBe(100)
  })
})

describe('resolveCartLocationConfig', () => {
  it('prefers min_order_amount from delivery config', () => {
    const result = resolveCartLocationConfig({
      min_order_amount: 42,
      delivery_fee: 6.5,
    })

    expect(result).toEqual({
      minOrderAmount: 42,
      deliveryFee: 6.5,
    })
  })

  it('falls back to legacy min_order_value', () => {
    const result = resolveCartLocationConfig({
      min_order_value: 33,
      delivery_fee: 8.25,
    })

    expect(result).toEqual({
      minOrderAmount: 33,
      deliveryFee: 8.25,
    })
  })

  it('returns defaults for missing values', () => {
    const result = resolveCartLocationConfig(undefined)

    expect(result).toEqual({
      minOrderAmount: 35,
      deliveryFee: 7.99,
    })
  })
})
