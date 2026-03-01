import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OperatorAuthState {
  isAuthenticated: boolean
  pin: string

  login: (pin: string) => boolean
  logout: () => void
  changePin: (oldPin: string, newPin: string) => { success: boolean; error?: string }
}

export const useOperatorAuthStore = create<OperatorAuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      pin: '0000',

      login: (pin: string) => {
        if (pin === get().pin) {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },

      logout: () => {
        set({ isAuthenticated: false })
      },

      changePin: (oldPin: string, newPin: string) => {
        if (oldPin !== get().pin) {
          return { success: false, error: 'Nieprawidłowy obecny PIN' }
        }
        if (!/^\d{4}$/.test(newPin)) {
          return { success: false, error: 'PIN musi składać się z 4 cyfr' }
        }
        set({ pin: newPin })
        return { success: true }
      },
    }),
    {
      name: 'meso-operator-auth',
    }
  )
)
