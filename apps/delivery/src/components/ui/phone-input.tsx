'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'

interface Country {
  code: string
  flag: string
  name: string
  maxDigits: number
}

const countries: Country[] = [
  { code: '48', flag: '\u{1F1F5}\u{1F1F1}', name: 'Polska', maxDigits: 9 },
  { code: '49', flag: '\u{1F1E9}\u{1F1EA}', name: 'Niemcy', maxDigits: 11 },
  { code: '420', flag: '\u{1F1E8}\u{1F1FF}', name: 'Czechy', maxDigits: 9 },
  { code: '421', flag: '\u{1F1F8}\u{1F1F0}', name: 'Slowacja', maxDigits: 9 },
  { code: '380', flag: '\u{1F1FA}\u{1F1E6}', name: 'Ukraina', maxDigits: 9 },
  { code: '370', flag: '\u{1F1F1}\u{1F1F9}', name: 'Litwa', maxDigits: 8 },
  { code: '371', flag: '\u{1F1F1}\u{1F1FB}', name: 'Lotwa', maxDigits: 8 },
  { code: '372', flag: '\u{1F1EA}\u{1F1EA}', name: 'Estonia', maxDigits: 8 },
  { code: '44', flag: '\u{1F1EC}\u{1F1E7}', name: 'Wielka Brytania', maxDigits: 10 },
  { code: '31', flag: '\u{1F1F3}\u{1F1F1}', name: 'Holandia', maxDigits: 9 },
  { code: '33', flag: '\u{1F1EB}\u{1F1F7}', name: 'Francja', maxDigits: 9 },
  { code: '43', flag: '\u{1F1E6}\u{1F1F9}', name: 'Austria', maxDigits: 10 },
  { code: '46', flag: '\u{1F1F8}\u{1F1EA}', name: 'Szwecja', maxDigits: 9 },
  { code: '47', flag: '\u{1F1F3}\u{1F1F4}', name: 'Norwegia', maxDigits: 8 },
  { code: '45', flag: '\u{1F1E9}\u{1F1F0}', name: 'Dania', maxDigits: 8 },
]

export function parsePhone(value: string): { countryCode: string; localNumber: string } {
  if (!value) return { countryCode: '48', localNumber: '' }

  const digits = value.replace(/\D/g, '')

  // Try matching country codes (longest first to avoid partial matches)
  const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length)
  for (const country of sortedCountries) {
    if (digits.startsWith(country.code)) {
      return { countryCode: country.code, localNumber: digits.slice(country.code.length) }
    }
  }

  // No prefix match — assume Polish number
  return { countryCode: '48', localNumber: digits }
}

/** Build canonical E.164 string from any phone input (strips formatting, adds +). */
export function normalizePhone(value: string): string {
  if (!value) return ''
  const { countryCode, localNumber } = parsePhone(value)
  return localNumber ? `+${countryCode}${localNumber}` : ''
}

interface PhoneInputProps {
  value: string
  onChange: (fullPhone: string) => void
  error?: string
  className?: string
  id?: string
}

export function PhoneInput({ value, onChange, error, className, id }: PhoneInputProps) {
  const parsed = useMemo(() => parsePhone(value), [value])
  const [countryCode, setCountryCode] = useState(parsed.countryCode)
  const [localNumber, setLocalNumber] = useState(parsed.localNumber)
  const [prevValue, setPrevValue] = useState(value)

  // Sync internal state when value changes externally (adjusting state during render)
  if (value !== prevValue) {
    setPrevValue(value)
    const p = parsePhone(value)
    setCountryCode(p.countryCode)
    setLocalNumber(p.localNumber)
  }

  // Normalize the form value to E.164 when it doesn't match canonical format.
  // This fixes the case where a phone loaded from DB (e.g., "48512129709" without "+")
  // displays correctly but fails Zod regex validation.
  useEffect(() => {
    if (!value) return
    const normalized = normalizePhone(value)
    if (normalized && normalized !== value) {
      onChange(normalized)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === countryCode) ?? countries[0],
    [countryCode]
  )

  const emitChange = useCallback(
    (code: string, local: string) => {
      if (local) {
        onChange('+' + code + local)
      } else {
        onChange('')
      }
    },
    [onChange]
  )

  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCode = e.target.value
      setCountryCode(newCode)
      emitChange(newCode, localNumber)
    },
    [localNumber, emitChange]
  )

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '')
      const trimmed = raw.slice(0, selectedCountry.maxDigits)
      setLocalNumber(trimmed)
      emitChange(countryCode, trimmed)
    },
    [countryCode, selectedCountry.maxDigits, emitChange]
  )

  const placeholder = '0'.repeat(selectedCountry.maxDigits).replace(/(\d{3})(?=\d)/g, '$1 ').trim()

  return (
    <div className={className}>
      <div
        className={`flex items-center rounded-lg border bg-secondary/50 focus-within:border-primary/50 ${
          error ? 'border-red-400' : 'border-border'
        }`}
      >
        {/* Country selector */}
        <div className="relative flex items-center border-r border-border pl-3 pr-1">
          <span className="pointer-events-none text-base leading-none">{selectedCountry.flag}</span>
          <span className="pointer-events-none ml-1.5 text-sm text-foreground">+{countryCode}</span>
          <select
            value={countryCode}
            onChange={handleCountryChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Kod kraju"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} (+{c.code})
              </option>
            ))}
          </select>
          <svg className="pointer-events-none ml-1 h-3 w-3 text-muted-foreground" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Number input */}
        <input
          id={id}
          inputMode="numeric"
          autoComplete="tel-national"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          maxLength={selectedCountry.maxDigits + 5}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </div>
  )
}
