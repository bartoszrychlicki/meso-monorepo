import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import type { LoyaltyTier } from '@/types/customer'

interface CustomerLoyalty {
  points: number
  tier: LoyaltyTier
  lifetimePoints: number
  isLoading: boolean
  refresh: () => void
}

/**
 * Hook for fetching the current user's loyalty points and tier from Supabase.
 * Replaces hardcoded MOCK_POINTS and points = 340.
 */
export function useCustomerLoyalty(): CustomerLoyalty {
  const { user, isPermanent } = useAuth()
  const [points, setPoints] = useState(0)
  const [tier, setTier] = useState<LoyaltyTier>('bronze')
  const [lifetimePoints, setLifetimePoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!user || !isPermanent) {
      setIsLoading(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    const supabase = createClient()
    supabase
      .from('crm_customers')
      .select('loyalty_points, loyalty_tier, lifetime_points')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setPoints(data.loyalty_points ?? 0)
          setTier((data.loyalty_tier as LoyaltyTier) ?? 'bronze')
          setLifetimePoints(data.lifetime_points ?? 0)
        }
        setIsLoading(false)
      })
  }, [user, isPermanent, refreshKey])

  return { points, tier, lifetimePoints, isLoading, refresh }
}
