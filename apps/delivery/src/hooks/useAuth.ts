// Re-export useAuth from AuthProvider for convenience
export { useAuth } from '@/providers/AuthProvider'

// Additional auth utility hook for checking specific permissions
import { useState, useEffect } from 'react'
import { useAuth as useAuthBase } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook for checking if user can access MESO Club features
 * Only authenticated (registered) users can use loyalty features
 */
export function useMesoClub() {
  const { isAuthenticated, isLoading } = useAuthBase()

  return {
    canUseRewards: isAuthenticated,
    canEarnPoints: isAuthenticated,
    canUseReferralCode: isAuthenticated,
    isLoading,
  }
}

/**
 * Resolve display name from user metadata, preferring full_name > first+last > name > email prefix
 */
function resolveMetadataName(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null
  if (typeof meta.full_name === 'string' && meta.full_name.trim()) return meta.full_name.trim()
  const first = typeof meta.first_name === 'string' ? meta.first_name.trim() : ''
  const last = typeof meta.last_name === 'string' ? meta.last_name.trim() : ''
  if (first || last) return `${first} ${last}`.trim()
  if (typeof meta.name === 'string' && meta.name.trim()) return meta.name.trim()
  return null
}

/**
 * Hook for getting user display info
 * Returns appropriate display name for authenticated users
 * Prefers crm_customers name, then user metadata, then email prefix
 */
export function useUserDisplay() {
  const { user, isAuthenticated } = useAuthBase()
  const [customerName, setCustomerName] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !isAuthenticated) return

    const supabase = createClient()
    supabase
      .from('crm_customers')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const first = typeof data.first_name === 'string' ? data.first_name.trim() : ''
          const last = typeof data.last_name === 'string' ? data.last_name.trim() : ''
          const fullName = `${first} ${last}`.trim()
          if (fullName) setCustomerName(fullName)
        }
      })
  }, [user, isAuthenticated])

  const metadataName = resolveMetadataName(user?.user_metadata)

  const displayName = isAuthenticated
    ? customerName || metadataName || user?.email?.split('@')[0] || 'Użytkownik'
    : 'Gość'

  const avatarInitial = isAuthenticated
    ? (customerName?.[0] || metadataName?.[0] || user?.email?.[0] || 'U').toUpperCase()
    : 'G'

  return {
    displayName,
    avatarInitial,
    email: isAuthenticated ? user?.email : null,
    isAuthenticated,
  }
}
