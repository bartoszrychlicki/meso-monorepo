import { describe, expect, it } from 'vitest'
import { formatPrice, formatPriceDelta, formatPriceExact } from '../formatters'

describe('formatters', () => {
  it('formats price in PLN', () => {
    expect(formatPrice(12.5)).toBe('12,50 zł')
  })

  it('formats exact price in PLN', () => {
    expect(formatPriceExact(7)).toBe('7,00 zł')
  })

  it('formats positive price deltas with plus sign', () => {
    expect(formatPriceDelta(8)).toBe('+8,00 zł')
  })

  it('formats negative price deltas with minus sign', () => {
    expect(formatPriceDelta(-3.5)).toBe('-3,50 zł')
  })

  it('does not render zero deltas', () => {
    expect(formatPriceDelta(0)).toBeNull()
  })
})
