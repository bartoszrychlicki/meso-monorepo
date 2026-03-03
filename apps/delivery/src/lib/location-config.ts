export interface DeliveryConfigRecord {
  opening_time?: string | null
  closing_time?: string | null
  pickup_time_min?: number | null
  estimated_delivery_minutes?: number | null
  pickup_buffer_after_open?: number | null
  pickup_buffer_before_close?: number | null
  pay_on_pickup_enabled?: boolean | null
  pay_on_pickup_fee?: number | null
  pay_on_pickup_max_order?: number | null
  min_order_amount?: number | null
  min_order_value?: number | null
  delivery_fee?: number | null
}

export interface CheckoutRuntimeConfig {
  openTime: string
  closeTime: string
  pickupBufferAfterOpen: number
  pickupBufferBeforeClose: number
  pickupEstimateMinutes: number
  payOnPickupEnabled: boolean
  payOnPickupFee: number
  payOnPickupMaxOrder: number
}

export interface CartLocationConfig {
  minOrderAmount: number
  deliveryFee: number
}

const DEFAULTS = {
  openTime: '11:00',
  closeTime: '22:00',
  pickupBufferAfterOpen: 30,
  pickupBufferBeforeClose: 30,
  pickupEstimateMinutes: 20,
  payOnPickupEnabled: true,
  payOnPickupFee: 2,
  payOnPickupMaxOrder: 100,
  minOrderAmount: 35,
  deliveryFee: 7.99,
} as const

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback
}

function asPositiveNumber(value: unknown, fallback: number): number {
  const parsed = asNumber(value, fallback)
  return parsed > 0 ? parsed : fallback
}

function asTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length < 4) return fallback
  return value
}

export function resolveCheckoutConfig(config: DeliveryConfigRecord | null | undefined): CheckoutRuntimeConfig {
  const pickupEstimateMinutes = config?.pickup_time_min != null
    ? asNumber(config.pickup_time_min, DEFAULTS.pickupEstimateMinutes)
    : asNumber(config?.estimated_delivery_minutes, DEFAULTS.pickupEstimateMinutes)

  return {
    openTime: asTime(config?.opening_time, DEFAULTS.openTime),
    closeTime: asTime(config?.closing_time, DEFAULTS.closeTime),
    pickupBufferAfterOpen: asNumber(config?.pickup_buffer_after_open, DEFAULTS.pickupBufferAfterOpen),
    pickupBufferBeforeClose: asNumber(config?.pickup_buffer_before_close, DEFAULTS.pickupBufferBeforeClose),
    pickupEstimateMinutes,
    payOnPickupEnabled: typeof config?.pay_on_pickup_enabled === 'boolean'
      ? config.pay_on_pickup_enabled
      : DEFAULTS.payOnPickupEnabled,
    payOnPickupFee: asNumber(config?.pay_on_pickup_fee, DEFAULTS.payOnPickupFee),
    // Some legacy rows store max order as 0, which effectively disables this payment method.
    // Treat non-positive values as missing and fall back to safe default.
    payOnPickupMaxOrder: asPositiveNumber(
      config?.pay_on_pickup_max_order,
      DEFAULTS.payOnPickupMaxOrder
    ),
  }
}

export function resolveCartLocationConfig(config: DeliveryConfigRecord | null | undefined): CartLocationConfig {
  const minOrderRaw = config?.min_order_amount ?? config?.min_order_value

  return {
    minOrderAmount: asNumber(minOrderRaw, DEFAULTS.minOrderAmount),
    deliveryFee: asNumber(config?.delivery_fee, DEFAULTS.deliveryFee),
  }
}
