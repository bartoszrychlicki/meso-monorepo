import { describe, it, expect } from 'vitest'
import { formatOrderDisplayId } from '../format-order-display-id'

describe('formatOrderDisplayId', () => {
  it('returns order_number when available', () => {
    expect(
      formatOrderDisplayId('66dda102-abcd-1234-5678-abcdef012345', 'WEB-20260228-181137-099')
    ).toBe('WEB-20260228-181137-099')
  })

  it('falls back to last 8 chars uppercase when order_number is undefined', () => {
    expect(
      formatOrderDisplayId('66dda102-abcd-1234-5678-abcdef012345', undefined)
    ).toBe('EF012345')
  })

  it('falls back to last 8 chars uppercase when order_number is null', () => {
    expect(
      formatOrderDisplayId('66dda102-abcd-1234-5678-abcdef012345', null)
    ).toBe('EF012345')
  })

  it('falls back to last 8 chars uppercase when order_number is empty string', () => {
    expect(
      formatOrderDisplayId('66dda102-abcd-1234-5678-abcdef012345', '')
    ).toBe('EF012345')
  })

  it('handles short IDs gracefully', () => {
    expect(formatOrderDisplayId('abc', undefined)).toBe('ABC')
  })
})
