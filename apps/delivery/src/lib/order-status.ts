import type { OrderStatus as CoreOrderStatus } from '@meso/core'

export type LegacyOrderStatus =
  | 'pending_payment'
  | 'awaiting_courier'
  | 'in_delivery'

export type RawOrderStatus = CoreOrderStatus | LegacyOrderStatus | string
export type NormalizedOrderStatus = CoreOrderStatus | 'unknown'
export type DisplayOrderStatus = CoreOrderStatus | 'pending_payment' | 'unknown'

const LEGACY_STATUS_MAP: Record<LegacyOrderStatus, CoreOrderStatus> = {
  pending_payment: 'pending',
  awaiting_courier: 'ready',
  in_delivery: 'out_for_delivery',
}

const CANONICAL_STATUSES = new Set<CoreOrderStatus>([
  'pending',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
])

export function normalizeOrderStatus(
  rawStatus: RawOrderStatus | null | undefined
): NormalizedOrderStatus {
  if (!rawStatus) return 'unknown'
  if (rawStatus in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[rawStatus as LegacyOrderStatus]
  }
  if (CANONICAL_STATUSES.has(rawStatus as CoreOrderStatus)) {
    return rawStatus as CoreOrderStatus
  }
  return 'unknown'
}

export function isPaymentPending(paymentStatus: string | null | undefined): boolean {
  if (!paymentStatus) return true
  return paymentStatus !== 'paid'
    && paymentStatus !== 'pay_on_pickup'
    && paymentStatus !== 'failed'
    && paymentStatus !== 'cancelled'
}

export function toDisplayOrderStatus(
  rawStatus: RawOrderStatus | null | undefined,
  paymentStatus: string | null | undefined
): DisplayOrderStatus {
  const normalized = normalizeOrderStatus(rawStatus)
  if (normalized === 'unknown') return 'unknown'
  if (normalized === 'pending' && isPaymentPending(paymentStatus)) {
    return 'pending_payment'
  }
  return normalized
}
