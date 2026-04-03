'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@meso/core';
import { DEFAULT_LOCALE } from '@meso/core';
import { POS_MESSAGES } from './messages';
import { writePosLocaleCookie } from './config';

type TranslationValues = Record<string, string | number>;

type PosI18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const PosI18nContext = createContext<PosI18nContextValue | undefined>(undefined);

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;

  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function PosI18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    writePosLocaleCookie(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const template =
        POS_MESSAGES[locale][key] ??
        POS_MESSAGES[DEFAULT_LOCALE][key] ??
        key;

      return interpolate(template, values);
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <PosI18nContext.Provider value={contextValue}>
      {children}
    </PosI18nContext.Provider>
  );
}

export function usePosI18n(): PosI18nContextValue {
  const context = useContext(PosI18nContext);

  if (!context) {
    throw new Error('usePosI18n must be used within PosI18nProvider');
  }

  return context;
}
