import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LoyaltyRewardRow {
  id: string
  name: string
  description: string | null
  points_cost: number
  reward_type: 'free_delivery' | 'discount' | 'free_product'
  discount_value: number | null
  free_product_id: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  min_tier: 'bronze' | 'silver' | 'gold'
}

interface UseLoyaltyRewardsResult {
  rewards: LoyaltyRewardRow[]
  isLoading: boolean
}

/**
 * Hook for fetching active loyalty rewards from Supabase.
 * Replaces LOYALTY_REWARDS constant and REWARDS array.
 */
export function useLoyaltyRewards(): UseLoyaltyRewardsResult {
  const [rewards, setRewards] = useState<LoyaltyRewardRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('crm_loyalty_rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setRewards(data as LoyaltyRewardRow[])
        }
        setIsLoading(false)
      })
  }, [])

  return { rewards, isLoading }
}
