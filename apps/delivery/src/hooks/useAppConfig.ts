import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/table-mapping'

interface AppConfigMap {
  [key: string]: unknown
}

interface AppConfigRow {
  key: string
  value: unknown
}

interface UseAppConfigResult {
  config: AppConfigMap
  isLoading: boolean
  getValue: <T = unknown>(key: string, fallback: T) => T
}

/**
 * Hook for fetching app configuration from the app_config table.
 * Replaces hardcoded TIER_THRESHOLDS and other business config.
 */
export function useAppConfig(): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfigMap>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from(Tables.appConfig)
      .select('key, value')
      .then(({ data, error }: { data: AppConfigRow[] | null; error: unknown }) => {
        if (!error && data) {
          const map: AppConfigMap = {}
          for (const row of data) {
            map[row.key] = row.value
          }
          setConfig(map)
        }
        setIsLoading(false)
      })
  }, [])

  const getValue = <T = unknown>(key: string, fallback: T): T => {
    if (key in config) return config[key] as T
    return fallback
  }

  return { config, isLoading, getValue }
}
