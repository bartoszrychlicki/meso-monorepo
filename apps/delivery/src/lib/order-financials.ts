type GenericRecord = Record<string, unknown>

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as GenericRecord
}

export function readNumberLike(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

export function readOrderDiscount(order: { discount?: unknown; promo_discount?: unknown }): number {
  const canonicalDiscount = readNumberLike(order.discount)
  if (canonicalDiscount > 0) {
    return canonicalDiscount
  }

  return readNumberLike(order.promo_discount)
}

export function readOrderDeliveryFee(order: { delivery_fee?: unknown }): number {
  return readNumberLike(order.delivery_fee)
}

export function readOrderPaymentFee(order: { metadata?: unknown }): number {
  const metadata = asRecord(order.metadata)
  return readNumberLike(metadata?.payment_fee)
}
