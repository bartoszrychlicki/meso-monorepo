'use client'

import { cn } from '@/lib/utils'

interface MesoLogoProps {
  variant?: 'full' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
}

export function MesoLogo({ variant = 'full', size = 'md', className }: MesoLogoProps) {
  if (variant === 'icon') {
    return (
      <span className={cn('font-display font-bold tracking-tight text-white', sizeClasses[size], className)}>
        M
      </span>
    )
  }

  return (
    <span className={cn('font-display font-bold tracking-tight text-white', sizeClasses[size], className)}>
      MESO
    </span>
  )
}
