import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { fetchCustomerByAuthId } from '@/lib/customers'
import { Tables } from '@/lib/table-mapping'

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
    fetchCustomerByAuthId<{ id: string }>(supabase, user.id, 'id')
      .then((customer) => {
        if (!customer) {
          setIsLoading(false)
          return null
        }

        return supabase
          .from(Tables.loyaltyTransactions)
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(50)
      })
      .then((result) => {
        if (result && !result.error && result.data) {
          setHistory(result.data as LoyaltyHistoryEntry[])
        }
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [user, isPermanent])

  return { history, isLoading }
}
