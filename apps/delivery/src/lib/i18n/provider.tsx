'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Locale } from '@meso/core'
import { DEFAULT_LOCALE } from '@meso/core'
import { DELIVERY_MESSAGES } from './messages'
import { writeDeliveryLocaleCookie } from './config'

type TranslationValues = Record<string, string | number>

type DeliveryI18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: TranslationValues) => string
}

const DeliveryI18nContext = createContext<DeliveryI18nContextValue | undefined>(undefined)

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

export function DeliveryI18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    writeDeliveryLocaleCookie(nextLocale)
  }, [])

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const template =
        DELIVERY_MESSAGES[locale][key]
        ?? DELIVERY_MESSAGES[DEFAULT_LOCALE][key]
        ?? key

      return interpolate(template, values)
    },
    [locale]
  )

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return (
    <DeliveryI18nContext.Provider value={contextValue}>
      {children}
    </DeliveryI18nContext.Provider>
  )
}

export function useDeliveryI18n(): DeliveryI18nContextValue {
  const context = useContext(DeliveryI18nContext)

  if (!context) {
    throw new Error('useDeliveryI18n must be used within DeliveryI18nProvider')
  }

  return context
}
