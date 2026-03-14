import { describe, expect, it } from 'vitest'
import {
  formatDateInputValue,
  formatOrderingPausedUntilDate,
  generatePickupSlotsForDate,
  isPayOnPickupAvailable,
  resolveCartLocationConfig,
  resolveCheckoutConfig,
  resolveOrderingAvailability,
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

describe('resolveOrderingAvailability', () => {
  it('returns paused state before reopen date opening time', () => {
    const result = resolveOrderingAvailability(
      {
        opening_time: '11:00:00',
        ordering_paused_until_date: '2026-03-20',
      },
      new Date(2026, 2, 19, 18, 0, 0)
    )

    expect(result).toEqual({
      isOrderingPaused: true,
      orderingPausedUntilDate: '2026-03-20',
      firstAvailableDate: '2026-03-20',
      firstAvailableTime: '11:00',
    })
  })

  it('stops treating ordering as paused after opening time on reopen date', () => {
    const result = resolveOrderingAvailability(
      {
        opening_time: '11:00:00',
        ordering_paused_until_date: '2026-03-20',
      },
      new Date(2026, 2, 20, 11, 1, 0)
    )

    expect(result.isOrderingPaused).toBe(false)
    expect(result.firstAvailableDate).toBe('2026-03-20')
    expect(result.firstAvailableTime).toBe('11:00')
  })

  it('returns inactive state when no reopen date is configured', () => {
    expect(resolveOrderingAvailability({ opening_time: '11:00:00' })).toEqual({
      isOrderingPaused: false,
      orderingPausedUntilDate: null,
      firstAvailableDate: null,
      firstAvailableTime: null,
    })
  })
})

describe('generatePickupSlotsForDate', () => {
  it('generates same-day slots using buffers and 30-minute lead time', () => {
    const slots = generatePickupSlotsForDate({
      date: '2026-03-20',
      now: new Date(2026, 2, 20, 10, 20, 0),
      config: {
        opening_time: '11:00:00',
        closing_time: '14:00:00',
        pickup_buffer_after_open: 30,
        pickup_buffer_before_close: 30,
      },
    })

    expect(slots[0]).toBe('11:30')
    expect(slots.at(-1)).toBe('13:30')
  })

  it('allows reopen date slots from opening time when forced by ordering pause', () => {
    const slots = generatePickupSlotsForDate({
      date: '2026-03-20',
      now: new Date(2026, 2, 19, 18, 0, 0),
      forceEarliestDateTime: new Date(2026, 2, 20, 11, 0, 0),
      config: {
        opening_time: '11:00:00',
        closing_time: '13:00:00',
        pickup_buffer_after_open: 30,
        pickup_buffer_before_close: 0,
      },
    })

    expect(slots[0]).toBe('11:00')
  })
})

describe('formatters', () => {
  it('formats dates for date input values', () => {
    expect(formatDateInputValue(new Date(2026, 2, 20, 15, 0, 0))).toBe('2026-03-20')
  })

  it('formats paused-until date for banner copy', () => {
    const result = formatOrderingPausedUntilDate('2026-03-20')

    expect(result).toContain('2026')
    expect(result).not.toBe('2026-03-20')
  })
})
