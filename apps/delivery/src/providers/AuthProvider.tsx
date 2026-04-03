'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { AuthChangeEvent, User, Session } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PENDING_REFERRAL_INPUT_KEY } from '@/lib/referrals'
import { fetchCustomerByAuthId } from '@/lib/customers'
import { useDeliveryI18n } from '@/lib/i18n/provider'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isPermanent: boolean    // alias for isAuthenticated (backward compat)
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const processedReferralKeyRef = useRef<string | null>(null)

  // Use state to ensure single instance across renders
  const [supabase] = useState(() => createClient())
  const { setLocale } = useDeliveryI18n()

  // All users must be registered — no anonymous flow
  const isPermanent = !!user
  const isAuthenticated = !!user

  const initAuth = useCallback(async () => {
    try {
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (currentSession) {
        setSession(currentSession)
        setUser(currentSession.user)
      }
      // No anonymous fallback — user stays unauthenticated until they log in
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const refreshSession = useCallback(async () => {
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
    if (refreshedSession) {
      setSession(refreshedSession)
      setUser(refreshedSession.user)
    }
  }, [supabase])

  useEffect(() => {
    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        // No re-login to anonymous on SIGNED_OUT — user stays logged out
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [initAuth, supabase])

  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    const pendingReferralInput = window.localStorage.getItem(PENDING_REFERRAL_INPUT_KEY)?.trim()
    if (!pendingReferralInput) return

    const requestKey = `${user.id}:${pendingReferralInput}`
    if (processedReferralKeyRef.current === requestKey) return
    processedReferralKeyRef.current = requestKey

    void fetch('/api/loyalty/apply-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_input: pendingReferralInput }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        window.localStorage.removeItem(PENDING_REFERRAL_INPUT_KEY)

        if (response.ok) {
          toast.success(payload.message || 'Polecenie zostało zapisane')
          return
        }

        if (response.status !== 409) {
          toast.error(payload.error || 'Nie udało się zastosować polecenia')
        }
      })
      .catch(() => {
        window.localStorage.removeItem(PENDING_REFERRAL_INPUT_KEY)
        toast.error('Nie udało się zastosować polecenia')
      })
  }, [user])

  useEffect(() => {
    if (!user?.id) return

    fetchCustomerByAuthId<{ ui_language: 'pl' | 'en' | null }>(
      supabase,
      user.id,
      'ui_language'
    )
      .then((data) => {
        if (data?.ui_language) {
          setLocale(data.ui_language)
        }
      })
      .catch((error) => {
        console.error('Failed to sync delivery locale from customer profile', error)
      })
  }, [setLocale, supabase, user?.id])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isPermanent,
        isAuthenticated,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
