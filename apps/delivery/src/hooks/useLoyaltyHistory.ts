import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export interface LoyaltyHistoryEntry {
  id: string
  label: string
  amount: number
  reason: 'earned' | 'spent' | 'bonus' | 'expired'
  related_order_id: string | null
  created_at: string
}

interface UseLoyaltyHistoryResult {
  history: LoyaltyHistoryEntry[]
  isLoading: boolean
}

/**
 * Hook for fetching the current user's loyalty point history from Supabase.
 * Replaces the HISTORY mock array.
 */
export function useLoyaltyHistory(): UseLoyaltyHistoryResult {
  const { user, isPermanent } = useAuth()
  const [history, setHistory] = useState<LoyaltyHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !isPermanent) {
      setIsLoading(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    const supabase = createClient()
    supabase
      .from('crm_loyalty_transactions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          setHistory(data as LoyaltyHistoryEntry[])
        }
        setIsLoading(false)
      })
  }, [user, isPermanent])

  return { history, isLoading }
}
