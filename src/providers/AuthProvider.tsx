'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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

  // Use state to ensure single instance across renders
  const [supabase] = useState(() => createClient())

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
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        // No re-login to anonymous on SIGNED_OUT — user stays logged out
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [initAuth, supabase])

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
