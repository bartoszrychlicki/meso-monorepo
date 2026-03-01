'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const MAX_TIP = 200

const TIP_OPTIONS = [0, 5, 10, 15]

export function TipSelector() {
  const tip = useCartStore((state) => state.tip)
  const setTip = useCartStore((state) => state.setTip)
  const [customTip, setCustomTip] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const handleTipSelect = (amount: number) => {
    setTip(amount)
    setShowCustom(false)
    setCustomTip('')
  }

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value)
    // Clear tip if input is emptied
    if (value === '') {
      setTip(0)
      return
    }
    const amount = parseFloat(value)
    if (!isNaN(amount) && amount >= 0 && amount <= MAX_TIP) {
      setTip(amount)
    }
  }

  const handleCustomTip = () => {
    const amount = parseFloat(customTip)
    if (isNaN(amount) || amount < 0 || amount > MAX_TIP) {
      toast.error(`Napiwek musi być w zakresie 0–${MAX_TIP} zł`)
      setCustomTip(amount > MAX_TIP ? String(MAX_TIP) : '')
      setTip(amount > MAX_TIP ? MAX_TIP : 0)
      return
    }
    setTip(amount)
  }

  const isSelected = (amount: number) => tip === amount && !showCustom

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Napiwek dla kucharzy</h3>
      </div>

      <div className="flex gap-2">
        {TIP_OPTIONS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleTipSelect(amount)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              isSelected(amount)
                ? 'bg-primary text-primary-foreground neon-glow-sm'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            )}
          >
            {amount === 0 ? 'Bez' : `${amount} zł`}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className={cn(
          'w-full rounded-lg py-2 text-sm font-medium transition-all',
          showCustom
            ? 'bg-primary/20 text-primary border border-primary'
            : 'bg-secondary text-foreground hover:bg-secondary/80'
        )}
      >
        Inna kwota
      </button>

      {showCustom && (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              min="0"
              max={MAX_TIP}
              step="1"
              value={customTip}
              onChange={(e) => handleCustomTipChange(e.target.value)}
              placeholder="Wpisz kwotę"
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">zł</span>
          </div>
          <button
            type="button"
            onClick={handleCustomTip}
            disabled={parseFloat(customTip) > MAX_TIP}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
      )}
      {showCustom && parseFloat(customTip) > MAX_TIP && (
        <p className="text-xs text-destructive">Maksymalny napiwek to {MAX_TIP} zł</p>
      )}
    </div>
  )
}
