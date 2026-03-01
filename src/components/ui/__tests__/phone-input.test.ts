import { describe, it, expect } from 'vitest'
import { parsePhone, normalizePhone } from '../phone-input'

describe('parsePhone', () => {
  it('parses full E.164 number with + prefix', () => {
    expect(parsePhone('+48512129709')).toEqual({
      countryCode: '48',
      localNumber: '512129709',
    })
  })

  it('parses digits-only number without + prefix', () => {
    expect(parsePhone('48512129709')).toEqual({
      countryCode: '48',
      localNumber: '512129709',
    })
  })

  it('parses local number without country code (assumes Poland)', () => {
    expect(parsePhone('512129709')).toEqual({
      countryCode: '48',
      localNumber: '512129709',
    })
  })

  it('handles number with spaces', () => {
    expect(parsePhone('+48 512 129 709')).toEqual({
      countryCode: '48',
      localNumber: '512129709',
    })
  })

  it('handles number with dashes', () => {
    expect(parsePhone('+48-512-129-709')).toEqual({
      countryCode: '48',
      localNumber: '512129709',
    })
  })

  it('returns empty localNumber for empty string', () => {
    expect(parsePhone('')).toEqual({
      countryCode: '48',
      localNumber: '',
    })
  })

  it('parses German number', () => {
    expect(parsePhone('+491711234567')).toEqual({
      countryCode: '49',
      localNumber: '1711234567',
    })
  })

  it('parses 3-digit country code (Czech Republic)', () => {
    expect(parsePhone('+420123456789')).toEqual({
      countryCode: '420',
      localNumber: '123456789',
    })
  })
})

describe('normalizePhone', () => {
  it('returns E.164 for already-correct number', () => {
    expect(normalizePhone('+48512129709')).toBe('+48512129709')
  })

  it('adds + prefix when missing', () => {
    expect(normalizePhone('48512129709')).toBe('+48512129709')
  })

  it('adds +48 prefix for bare local number', () => {
    expect(normalizePhone('512129709')).toBe('+48512129709')
  })

  it('strips spaces from number', () => {
    expect(normalizePhone('+48 512 129 709')).toBe('+48512129709')
  })

  it('strips dashes from number', () => {
    expect(normalizePhone('+48-512-129-709')).toBe('+48512129709')
  })

  it('returns empty string for empty input', () => {
    expect(normalizePhone('')).toBe('')
  })

  it('normalizes German number', () => {
    expect(normalizePhone('491711234567')).toBe('+491711234567')
  })
})
