import { describe, it, expect } from 'vitest'
import {
  buildCheckoutProfileUpdate,
  buildOrderCustomerFields,
  buildScheduledTimestamp,
} from '../useCheckout'

describe('buildCheckoutProfileUpdate', () => {
  it('includes first_name and last_name when provided', () => {
    const result = buildCheckoutProfileUpdate(
      { firstName: 'Jan', lastName: 'Kowalski', phone: '+48512129709' },
      false
    )
    expect(result).toEqual({ first_name: 'Jan', last_name: 'Kowalski' })
  })

  it('includes phone when savePhoneToProfile is true', () => {
    const result = buildCheckoutProfileUpdate(
      { firstName: 'Jan', lastName: 'Kowalski', phone: '+48512129709' },
      true
    )
    expect(result).toEqual({
      first_name: 'Jan',
      last_name: 'Kowalski',
      phone: '+48512129709',
    })
  })

  it('trims whitespace from names', () => {
    const result = buildCheckoutProfileUpdate(
      { firstName: '  Jan  ', lastName: ' Kowalski ', phone: '+48512129709' },
      false
    )
    expect(result).toEqual({ first_name: 'Jan', last_name: 'Kowalski' })
  })

  it('omits empty firstName and lastName', () => {
    const result = buildCheckoutProfileUpdate(
      { firstName: '', lastName: '', phone: '+48512129709' },
      false
    )
    expect(result).toEqual({})
  })
})

describe('buildOrderCustomerFields', () => {
  it('returns full name and phone from address data', () => {
    const result = buildOrderCustomerFields({
      firstName: 'Jan',
      lastName: 'Kowalski',
      phone: '+48512129709',
    })
    expect(result).toEqual({
      customer_name: 'Jan Kowalski',
      customer_phone: '+48512129709',
    })
  })

  it('returns only first name when last name is empty', () => {
    const result = buildOrderCustomerFields({
      firstName: 'Jan',
      lastName: '',
      phone: '+48512129709',
    })
    expect(result).toEqual({
      customer_name: 'Jan',
      customer_phone: '+48512129709',
    })
  })

  it('trims whitespace from names', () => {
    const result = buildOrderCustomerFields({
      firstName: '  Anna  ',
      lastName: '  Nowak  ',
      phone: '+48512129709',
    })
    expect(result).toEqual({
      customer_name: 'Anna Nowak',
      customer_phone: '+48512129709',
    })
  })

  it('returns null customer_name when both names are empty', () => {
    const result = buildOrderCustomerFields({
      firstName: '',
      lastName: '',
      phone: '+48512129709',
    })
    expect(result).toEqual({
      customer_name: null,
      customer_phone: '+48512129709',
    })
  })

  it('returns null customer_phone when phone is empty', () => {
    const result = buildOrderCustomerFields({
      firstName: 'Jan',
      lastName: 'Kowalski',
      phone: '',
    })
    expect(result).toEqual({
      customer_name: 'Jan Kowalski',
      customer_phone: null,
    })
  })
})

describe('buildScheduledTimestamp', () => {
  it('returns undefined for asap orders', () => {
    expect(buildScheduledTimestamp({
      time: 'asap',
      scheduledTime: '12:30',
    })).toBeUndefined()
  })

  it('builds ISO timestamp using explicit scheduledDate', () => {
    expect(buildScheduledTimestamp({
      time: 'scheduled',
      scheduledDate: '2026-03-20',
      scheduledTime: '12:30',
    })).toBe(new Date(2026, 2, 20, 12, 30, 0, 0).toISOString())
  })

  it('falls back to current day when scheduledDate is missing', () => {
    expect(
      buildScheduledTimestamp(
        {
          time: 'scheduled',
          scheduledTime: '09:15',
        },
        new Date(2026, 2, 19, 8, 0, 0, 0)
      )
    ).toBe(new Date(2026, 2, 19, 9, 15, 0, 0).toISOString())
  })
})
