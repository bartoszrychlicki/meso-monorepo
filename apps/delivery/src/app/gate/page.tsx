'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function GatePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <h1 className="font-display text-4xl font-bold tracking-widest text-primary neon-text mb-2">
          MESO
        </h1>
        <p className="text-white/50 text-sm mb-8">Smart Asian Comfort</p>

        {/* Info */}
        <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-4 mb-8">
          <p className="text-violet-300 text-sm">
            🚧 Strona w trybie testowym.<br />
            Podaj hasło, aby wejść.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Hasło dostępu"
            autoFocus
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm">Nieprawidłowe hasło</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-primary py-3 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sprawdzam...' : 'Wejdź'}
          </button>
        </form>

        <p className="text-white/30 text-xs mt-8">
          © {new Date().getFullYear()} MESO Food · Wkrótce przyjmujemy zamówienia!
        </p>
      </div>
    </div>
  )
}
