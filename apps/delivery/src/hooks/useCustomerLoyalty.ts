import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { fetchCustomerByAuthId } from '@/lib/customers'
import type { LoyaltyTier } from '@/types/customer'

interface CustomerLoyalty {
  customerId: string | null
  points: number
  tier: LoyaltyTier
  lifetimePoints: number
  referralCode: string | null
  isLoading: boolean
  refresh: () => void
}

interface CustomerLoyaltyRow {
  id: string
  loyalty_points: number | null
  loyalty_tier: string | null
  lifetime_points: number | null
  referral_code: string | null
}

/**
 * Hook for fetching the current user's loyalty points and tier from Supabase.
 * Replaces hardcoded MOCK_POINTS and points = 340.
 */
export function useCustomerLoyalty(): CustomerLoyalty {
  const { user, isPermanent } = useAuth()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [tier, setTier] = useState<LoyaltyTier>('bronze')
  const [lifetimePoints, setLifetimePoints] = useState(0)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!user || !isPermanent) {
      setCustomerId(null) // eslint-disable-line react-hooks/set-state-in-effect
      setReferralCode(null) // eslint-disable-line react-hooks/set-state-in-effect
      setPoints(0) // eslint-disable-line react-hooks/set-state-in-effect
      setLifetimePoints(0) // eslint-disable-line react-hooks/set-state-in-effect
      setTier('bronze') // eslint-disable-line react-hooks/set-state-in-effect
      setIsLoading(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    const supabase = createClient()
    fetchCustomerByAuthId<CustomerLoyaltyRow>(
      supabase,
      user.id,
      'id, loyalty_points, loyalty_tier, lifetime_points, referral_code'
    )
      .then((data) => {
        if (data) {
          setCustomerId(data.id)
          setPoints(data.loyalty_points ?? 0)
          setTier((data.loyalty_tier as LoyaltyTier) ?? 'bronze')
          setLifetimePoints(data.lifetime_points ?? 0)
          setReferralCode(data.referral_code ?? null)
        }
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [user, isPermanent, refreshKey])

  return { customerId, points, tier, lifetimePoints, referralCode, isLoading, refresh }
}
