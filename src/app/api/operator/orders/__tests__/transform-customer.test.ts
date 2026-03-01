import { describe, it, expect } from 'vitest'
import { transformCustomer } from '../transform-customer'

describe('transformCustomer', () => {
  it('transforms full customer data into { name, phone, email }', () => {
    const result = transformCustomer({
      first_name: 'Jan',
      last_name: 'Kowalski',
      phone: '+48500000000',
      email: 'j@k.pl',
    })
    expect(result).toEqual({
      name: 'Jan Kowalski',
      phone: '+48500000000',
      email: 'j@k.pl',
    })
  })

  it('handles null last_name and null phone/email', () => {
    const result = transformCustomer({
      first_name: 'Jan',
      last_name: null,
      phone: null,
      email: null,
    })
    expect(result).toEqual({
      name: 'Jan',
      phone: null,
      email: null,
    })
  })

  it('returns null when customer is null', () => {
    const result = transformCustomer(null)
    expect(result).toBeNull()
  })

  it('handles missing email field gracefully', () => {
    const result = transformCustomer({
      first_name: 'Anna',
      last_name: 'Nowak',
      phone: '+48600000000',
    })
    expect(result).toEqual({
      name: 'Anna Nowak',
      phone: '+48600000000',
      email: null,
    })
  })
})
