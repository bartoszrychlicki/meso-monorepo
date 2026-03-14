export interface DeliveryConfigRecord {
  is_pickup_active?: boolean | null
  opening_time?: string | null
  closing_time?: string | null
  pickup_time_min?: number | null
  pickup_time_max?: number | null
  estimated_delivery_minutes?: number | null
  pickup_buffer_after_open?: number | null
  pickup_buffer_before_close?: number | null
  pay_on_pickup_enabled?: boolean | null
  pay_on_pickup_fee?: number | null
  pay_on_pickup_max_order?: number | null
  min_order_amount?: number | null
  min_order_value?: number | null
  delivery_fee?: number | null
  ordering_paused_until_date?: string | null
}

export interface CheckoutRuntimeConfig {
  pickupEnabled: boolean
  openTime: string
  closeTime: string
  pickupBufferAfterOpen: number
  pickupBufferBeforeClose: number
  pickupEstimateMinutes: number
  pickupEstimateMaxMinutes: number
  payOnPickupEnabled: boolean
  payOnPickupFee: number
  payOnPickupMaxOrder: number
}

export interface PayOnPickupConfig {
  enabled: boolean
  fee: number
  maxOrder: number
}

export interface CartLocationConfig {
  minOrderAmount: number
  deliveryFee: number
}

export interface OrderingAvailability {
  isOrderingPaused: boolean
  orderingPausedUntilDate: string | null
  firstAvailableDate: string | null
  firstAvailableTime: string | null
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

export function trimTimeSeconds(time: string | undefined | null): string {
  if (!time) return ''
  return time.replace(/^(\d{2}:\d{2}):\d{2}$/, '$1')
}

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildLocalDateTime(
  dateString: string | null | undefined,
  timeString: string | null | undefined
): Date | null {
  if (!dateString || !timeString) return null

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  const timeMatch = /^(\d{2}):(\d{2})/.exec(timeString)

  if (!dateMatch || !timeMatch) return null

  const [, year, month, day] = dateMatch
  const [, hours, minutes] = timeMatch
  const value = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0
  )

  return Number.isNaN(value.getTime()) ? null : value
}

export function resolveCheckoutConfig(
  config: DeliveryConfigRecord | null | undefined
): CheckoutRuntimeConfig {
  const pickupEstimateMinutes = config?.pickup_time_min != null
    ? asNumber(config.pickup_time_min, DEFAULTS.pickupEstimateMinutes)
    : asNumber(config?.estimated_delivery_minutes, DEFAULTS.pickupEstimateMinutes)
  const pickupEstimateMaxMinutes = config?.pickup_time_max != null
    ? asNumber(config.pickup_time_max, pickupEstimateMinutes)
    : pickupEstimateMinutes

  return {
    openTime: asTime(config?.opening_time, DEFAULTS.openTime),
    closeTime: asTime(config?.closing_time, DEFAULTS.closeTime),
    pickupEnabled: typeof config?.is_pickup_active === 'boolean'
      ? config.is_pickup_active
      : true,
    pickupBufferAfterOpen: asNumber(
      config?.pickup_buffer_after_open,
      DEFAULTS.pickupBufferAfterOpen
    ),
    pickupBufferBeforeClose: asNumber(
      config?.pickup_buffer_before_close,
      DEFAULTS.pickupBufferBeforeClose
    ),
    pickupEstimateMinutes,
    pickupEstimateMaxMinutes,
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

export function resolvePayOnPickupConfig(
  config: DeliveryConfigRecord | null | undefined
): PayOnPickupConfig {
  const runtimeConfig = resolveCheckoutConfig(config)

  return {
    enabled: runtimeConfig.payOnPickupEnabled,
    fee: runtimeConfig.payOnPickupFee,
    maxOrder: runtimeConfig.payOnPickupMaxOrder,
  }
}

export function isPayOnPickupAvailable(
  config: PayOnPickupConfig,
  orderSubtotal: number
): boolean {
  return config.enabled && orderSubtotal <= config.maxOrder
}

export function resolveCartLocationConfig(
  config: DeliveryConfigRecord | null | undefined
): CartLocationConfig {
  const minOrderRaw = config?.min_order_amount ?? config?.min_order_value

  return {
    minOrderAmount: asNumber(minOrderRaw, DEFAULTS.minOrderAmount),
    deliveryFee: asNumber(config?.delivery_fee, DEFAULTS.deliveryFee),
  }
}

export function resolveOrderingAvailability(
  config: DeliveryConfigRecord | null | undefined,
  now = new Date()
): OrderingAvailability {
  const orderingPausedUntilDate =
    typeof config?.ordering_paused_until_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(config.ordering_paused_until_date)
      ? config.ordering_paused_until_date
      : null

  if (!orderingPausedUntilDate) {
    return {
      isOrderingPaused: false,
      orderingPausedUntilDate: null,
      firstAvailableDate: null,
      firstAvailableTime: null,
    }
  }

  const runtimeConfig = resolveCheckoutConfig(config)
  const openTime = trimTimeSeconds(runtimeConfig.openTime) || DEFAULTS.openTime
  const reopenAt = buildLocalDateTime(orderingPausedUntilDate, openTime)

  if (!reopenAt) {
    return {
      isOrderingPaused: false,
      orderingPausedUntilDate: null,
      firstAvailableDate: null,
      firstAvailableTime: null,
    }
  }

  return {
    isOrderingPaused: now < reopenAt,
    orderingPausedUntilDate,
    firstAvailableDate: orderingPausedUntilDate,
    firstAvailableTime: openTime,
  }
}

export function formatOrderingPausedUntilDate(dateString: string): string {
  const date = buildLocalDateTime(dateString, '12:00')
  if (!date) return dateString

  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

type GeneratePickupSlotsOptions = {
  date: string
  config: DeliveryConfigRecord | null | undefined
  now?: Date
  forceEarliestDateTime?: Date | null
}

export function generatePickupSlotsForDate({
  date,
  config,
  now = new Date(),
  forceEarliestDateTime = null,
}: GeneratePickupSlotsOptions): string[] {
  const runtimeConfig = resolveCheckoutConfig(config)
  const openTime = trimTimeSeconds(runtimeConfig.openTime) || DEFAULTS.openTime
  const closeTime = trimTimeSeconds(runtimeConfig.closeTime) || DEFAULTS.closeTime

  const openDateTime = buildLocalDateTime(date, openTime)
  const closeDateTime = buildLocalDateTime(date, closeTime)

  if (!openDateTime || !closeDateTime || closeDateTime <= openDateTime) {
    return []
  }

  const earliest = new Date(openDateTime)
  if (forceEarliestDateTime) {
    earliest.setTime(forceEarliestDateTime.getTime())
  } else {
    earliest.setMinutes(earliest.getMinutes() + runtimeConfig.pickupBufferAfterOpen)
  }

  const latest = new Date(closeDateTime)
  latest.setMinutes(latest.getMinutes() - runtimeConfig.pickupBufferBeforeClose)

  const isSelectedToday = formatDateInputValue(now) === date
  if (isSelectedToday) {
    const sameDayCutoff = new Date(now.getTime() + 30 * 60 * 1000)
    if (sameDayCutoff > earliest) {
      earliest.setTime(sameDayCutoff.getTime())
    }
  }

  if (earliest > latest) {
    return []
  }

  const roundedStart = new Date(earliest)
  roundedStart.setMinutes(Math.ceil(roundedStart.getMinutes() / 15) * 15, 0, 0)

  const slots: string[] = []
  let cursor = roundedStart

  while (cursor <= latest) {
    slots.push(
      cursor.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    )
    cursor = new Date(cursor.getTime() + 15 * 60 * 1000)
  }

  return slots
}
