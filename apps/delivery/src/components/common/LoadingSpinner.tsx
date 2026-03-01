'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="text-sm text-white/70">{text}</p>}
    </div>
  )
}

export function FullPageLoader({ text = 'Ładowanie...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}
