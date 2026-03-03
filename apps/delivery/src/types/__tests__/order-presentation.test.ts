import { describe, it, expect } from 'vitest'
import {
  getOrderStatusMessage,
  getOrderStatusStyle,
  getTimelineStepIndex,
} from '../order'

describe('order presentation helpers', () => {
  it('returns safe fallback for unknown status', () => {
    const message = getOrderStatusMessage('unknown_status', 'paid')
    const style = getOrderStatusStyle('unknown_status', 'paid')

    expect(message.title).toBe('Aktualizujemy status')
    expect(style.icon).toBe('Clock')
  })

  it('supports canonical timeline statuses from POS contract', () => {
    expect(getTimelineStepIndex('pending', 'pending')).toBe(-1)
    expect(getTimelineStepIndex('accepted', 'paid')).toBe(0)
    expect(getTimelineStepIndex('out_for_delivery', 'paid')).toBe(3)
  })
})
