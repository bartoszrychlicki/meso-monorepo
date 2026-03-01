import { describe, it, expect } from 'vitest'
import { buildCheckoutProfileUpdate, buildOrderCustomerFields } from '../useCheckout'

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
