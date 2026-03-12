import { describe, expect, it } from 'vitest'
import {
  isPayOnPickupAvailable,
  resolveCartLocationConfig,
  resolveCheckoutConfig,
  resolvePayOnPickupConfig,
} from '@/lib/location-config'

describe('resolveCheckoutConfig', () => {
  it('maps values from orders_delivery_config', () => {
    const result = resolveCheckoutConfig({
      opening_time: '09:00:00',
      closing_time: '21:30:00',
      pickup_time_min: 25,
      pickup_time_max: 35,
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
      pickupEstimateMaxMinutes: 35,
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
    expect(result.pickupEstimateMaxMinutes).toBe(35)
  })

  it('returns defaults when config is missing', () => {
    const result = resolveCheckoutConfig(null)

    expect(result).toEqual({
      openTime: '11:00',
      closeTime: '22:00',
      pickupBufferAfterOpen: 30,
      pickupBufferBeforeClose: 30,
      pickupEstimateMinutes: 20,
      pickupEstimateMaxMinutes: 20,
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

describe('resolvePayOnPickupConfig', () => {
  it('preserves disabled state from location config', () => {
    const result = resolvePayOnPickupConfig({
      pay_on_pickup_enabled: false,
      pay_on_pickup_fee: 4,
      pay_on_pickup_max_order: 80,
    })

    expect(result).toEqual({
      enabled: false,
      fee: 4,
      maxOrder: 80,
    })
  })
})

describe('isPayOnPickupAvailable', () => {
  it('returns false when the method is disabled in location config', () => {
    expect(isPayOnPickupAvailable({
      enabled: false,
      fee: 2,
      maxOrder: 100,
    }, 40)).toBe(false)
  })

  it('returns false when subtotal exceeds location limit', () => {
    expect(isPayOnPickupAvailable({
      enabled: true,
      fee: 2,
      maxOrder: 100,
    }, 140)).toBe(false)
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
