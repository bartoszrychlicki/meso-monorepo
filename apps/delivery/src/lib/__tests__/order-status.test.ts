import { describe, it, expect } from 'vitest'
import {
  normalizeOrderStatus,
  toDisplayOrderStatus,
  isPaymentPending,
} from '../order-status'

describe('normalizeOrderStatus', () => {
  it('keeps canonical statuses unchanged', () => {
    expect(normalizeOrderStatus('accepted')).toBe('accepted')
    expect(normalizeOrderStatus('out_for_delivery')).toBe('out_for_delivery')
  })

  it('maps legacy statuses to canonical contract', () => {
    expect(normalizeOrderStatus('pending_payment')).toBe('pending')
    expect(normalizeOrderStatus('awaiting_courier')).toBe('ready')
    expect(normalizeOrderStatus('in_delivery')).toBe('out_for_delivery')
  })

  it('returns unknown for unrecognized status', () => {
    expect(normalizeOrderStatus('unexpected_status')).toBe('unknown')
    expect(normalizeOrderStatus('')).toBe('unknown')
  })
})

describe('toDisplayOrderStatus', () => {
  it('derives pending_payment presentation from pending + unresolved payment', () => {
    expect(toDisplayOrderStatus('pending', 'pending')).toBe('pending_payment')
    expect(toDisplayOrderStatus('pending_payment', 'pending')).toBe('pending_payment')
  })

  it('returns canonical status once payment is resolved', () => {
    expect(toDisplayOrderStatus('pending', 'paid')).toBe('pending')
    expect(toDisplayOrderStatus('accepted', 'paid')).toBe('accepted')
  })

  it('returns unknown display status for unknown raw status', () => {
    expect(toDisplayOrderStatus('weird', 'paid')).toBe('unknown')
  })
})

describe('isPaymentPending', () => {
  it('returns false for resolved payment statuses', () => {
    expect(isPaymentPending('paid')).toBe(false)
    expect(isPaymentPending('pay_on_pickup')).toBe(false)
    expect(isPaymentPending('failed')).toBe(false)
    expect(isPaymentPending('cancelled')).toBe(false)
  })

  it('returns true for unresolved or missing statuses', () => {
    expect(isPaymentPending('pending')).toBe(true)
    expect(isPaymentPending('processing')).toBe(true)
    expect(isPaymentPending(undefined)).toBe(true)
  })
})
