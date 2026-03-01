import { describe, it, expect } from 'vitest'
import { buildCheckoutProfileUpdate } from '../useCheckout'

describe('buildCheckoutProfileUpdate', () => {
  it('persists full name from checkout form after order submit', () => {
    const result = buildCheckoutProfileUpdate(
      {
        firstName: 'Jan',
        lastName: 'Kowalski',
        phone: '500600700',
      },
      false
    )

    expect(result).toEqual({
      first_name: 'Jan',
      last_name: 'Kowalski',
    })
  })

  it('includes phone only when user opted to save it', () => {
    const result = buildCheckoutProfileUpdate(
      {
        firstName: 'Jan',
        lastName: 'Kowalski',
        phone: '500600700',
      },
      true
    )

    expect(result).toEqual({
      first_name: 'Jan',
      last_name: 'Kowalski',
      phone: '500600700',
    })
  })

  it('trims checkout name parts before persisting', () => {
    const result = buildCheckoutProfileUpdate(
      {
        firstName: '  Jan  ',
        lastName: '  Kowalski ',
        phone: '500600700',
      },
      false
    )

    expect(result.first_name).toBe('Jan')
    expect(result.last_name).toBe('Kowalski')
  })
})
