'use client'

import { ShoppingCart, Search, AlertCircle, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type EmptyStateType = 'cart' | 'search' | 'orders' | 'error' | 'custom'

interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

const defaultConfig: Record<Exclude<EmptyStateType, 'custom'>, { icon: React.ReactNode; title: string; description: string }> = {
  cart: {
    icon: <ShoppingCart className="w-16 h-16 text-white/20" />,
    title: 'Koszyk jest pusty',
    description: 'Dodaj coś pysznego z menu!',
  },
  search: {
    icon: <Search className="w-16 h-16 text-white/20" />,
    title: 'Brak wyników',
    description: 'Spróbuj wyszukać coś innego',
  },
  orders: {
    icon: <UtensilsCrossed className="w-16 h-16 text-white/20" />,
    title: 'Brak zamówień',
    description: 'Złóż swoje pierwsze zamówienie!',
  },
  error: {
    icon: <AlertCircle className="w-16 h-16 text-primary/50" />,
    title: 'Coś poszło nie tak',
    description: 'Spróbuj odświeżyć stronę',
  },
}

export function EmptyState({
  type = 'custom',
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const config = type !== 'custom' ? defaultConfig[type] : null

  const displayIcon = icon || config?.icon
  const displayTitle = title || config?.title || 'Brak danych'
  const displayDescription = description || config?.description

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {displayIcon && <div className="mb-6">{displayIcon}</div>}

      <h3 className="text-xl font-semibold text-white mb-2">{displayTitle}</h3>

      {displayDescription && (
        <p className="text-white/60 text-sm max-w-xs mb-6">{displayDescription}</p>
      )}

      {action && (
        action.href ? (
          <Button asChild className="bg-primary hover:bg-primary/90 uppercase font-display font-bold tracking-wider text-base px-8 py-3 rounded-xl h-auto">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} className="bg-primary hover:bg-primary/90 uppercase font-display font-bold tracking-wider text-base px-8 py-3 rounded-xl h-auto">
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
