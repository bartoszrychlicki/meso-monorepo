'use client'

import Link from 'next/link'
import { Gift, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface AnonymousBannerProps {
  variant?: 'default' | 'compact' | 'checkout'
  className?: string
}

export function AnonymousBanner({ variant = 'default', className }: AnonymousBannerProps) {
  const { isAuthenticated, isLoading } = useAuth()

  // Only show for unauthenticated users (guests)
  if (isAuthenticated || isLoading) {
    return null
  }

  if (variant === 'compact') {
    return (
      <Link
        href="/register"
        className={cn(
          'flex items-center justify-between gap-3 p-3 rounded-lg',
          'bg-accent/10 border border-accent/30',
          'hover:bg-accent/15 hover:border-accent/50 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-accent" />
          <span className="text-sm text-accent">
            Załóż konto → <strong>+50 pkt</strong>
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-accent" />
      </Link>
    )
  }

  if (variant === 'checkout') {
    return (
      <div
        className={cn(
          'rounded-lg p-4',
          'bg-gradient-to-r from-accent/10 to-accent/5',
          'border border-accent/20',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white mb-1">
              Zbieraj punkty za zamówienia!
            </h4>
            <p className="text-sm text-white/60 mb-3">
              Załóż darmowe konto i odbierz <span className="text-accent font-semibold">50 punktów</span> na start.
              Za to zamówienie możesz zdobyć dodatkowe punkty!
            </p>
            <Link href="/register">
              <Button
                variant="outline"
                size="sm"
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                Załóż konto teraz
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div
      className={cn(
        'rounded-xl p-4 md:p-5',
        'bg-gradient-to-br from-accent/15 via-accent/10 to-transparent',
        'border border-accent/30',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <Gift className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            Dołącz do MESO Club!
          </h3>
          <p className="text-white/70 mb-4">
            Załóż darmowe konto i odbierz{' '}
            <span className="text-accent font-bold">50 punktów</span> na start.
            Zbieraj punkty za każde zamówienie i wymieniaj na darmowe dania!
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-accent">✓</span>
              1 zł = 1 punkt
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-accent">✓</span>
              Darmowe dania
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-accent">✓</span>
              Ekskluzywne promocje
            </div>
          </div>

          <Link href="/register">
            <Button className="bg-accent hover:bg-accent/90 text-black font-display font-semibold">
              Załóż konto i odbierz 50 pkt
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
