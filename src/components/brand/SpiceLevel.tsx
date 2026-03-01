'use client'

import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpiceLevelProps {
  level: 1 | 2 | 3
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

const labels = {
  1: 'Łagodny',
  2: 'Średni',
  3: 'Piekielny',
}

export function SpiceLevel({ level, size = 'md', showLabel = false, className }: SpiceLevelProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: level }).map((_, i) => (
        <Flame
          key={i}
          className={cn(
            sizeClasses[size],
            'text-primary fill-primary'
          )}
        />
      ))}
      {showLabel && (
        <span className="ml-1 text-sm text-white/70">{labels[level]}</span>
      )}
    </span>
  )
}

interface SpiceLevelSelectorProps {
  value: 1 | 2 | 3
  onChange: (level: 1 | 2 | 3) => void
  className?: string
}

export function SpiceLevelSelector({ value, onChange, className }: SpiceLevelSelectorProps) {
  const options = [
    { level: 1 as const, label: 'Łagodny', emoji: '🔥' },
    { level: 2 as const, label: 'Średni', emoji: '🔥🔥' },
    { level: 3 as const, label: 'Piekielny', emoji: '🔥🔥🔥' },
  ]

  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {options.map((option) => (
        <button
          key={option.level}
          type="button"
          onClick={() => onChange(option.level)}
          className={cn(
            'p-3 rounded-lg border-2 text-center transition-colors',
            value === option.level
              ? 'border-primary bg-primary/20'
              : 'border-muted hover:border-primary/50'
          )}
        >
          <p className="text-2xl mb-1">{option.emoji}</p>
          <p className="text-white text-sm">{option.label}</p>
        </button>
      ))}
    </div>
  )
}
