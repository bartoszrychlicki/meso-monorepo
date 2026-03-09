import { describe, expect, it } from 'vitest'

import { getLocationAddressParts } from '../location-address'

describe('getLocationAddressParts', () => {
  it('returns a raw string address as the street line', () => {
    expect(getLocationAddressParts('ul. Dluga 12')).toEqual({
      street: 'ul. Dluga 12',
      city: '',
      postalCode: '',
      country: '',
    })
  })

  it('extracts fields from a POS JSONB address object', () => {
    expect(
      getLocationAddressParts({
        street: 'ul. Grunwaldzka 10',
        city: 'Gdansk',
        postal_code: '80-001',
        country: 'PL',
      })
    ).toEqual({
      street: 'ul. Grunwaldzka 10',
      city: 'Gdansk',
      postalCode: '80-001',
      country: 'PL',
    })
  })

  it('returns empty fields for nullish or unsupported values', () => {
    expect(getLocationAddressParts(null)).toEqual({
      street: '',
      city: '',
      postalCode: '',
      country: '',
    })
    expect(getLocationAddressParts(123)).toEqual({
      street: '',
      city: '',
      postalCode: '',
      country: '',
    })
  })
})
