'use client'

import { Award, Star, Leaf, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type BadgeType = 'bestseller' | 'signature' | 'new' | 'vegan' | 'vegetarian' | 'spicy'

interface ProductBadgeProps {
  type: BadgeType
  size?: 'sm' | 'md'
  className?: string
}

const badgeConfig: Record<BadgeType, { label: string; icon: React.ReactNode; className: string }> = {
  bestseller: {
    label: 'BESTSELLER',
    icon: <Award className="w-3 h-3" />,
    className: 'bg-accent text-black hover:bg-accent',
  },
  signature: {
    label: 'SIGNATURE',
    icon: <Star className="w-3 h-3" />,
    className: 'bg-primary text-white hover:bg-primary/90',
  },
  new: {
    label: 'NEW',
    icon: <Sparkles className="w-3 h-3" />,
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  vegan: {
    label: 'VEGAN',
    icon: <Leaf className="w-3 h-3" />,
    className: 'bg-green-600 text-white hover:bg-green-700',
  },
  vegetarian: {
    label: 'VEGE',
    icon: <Leaf className="w-3 h-3" />,
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  spicy: {
    label: 'SPICY',
    icon: null,
    className: 'bg-orange-500 text-white hover:bg-orange-600',
  },
}

export function ProductBadge({ type, size = 'md', className }: ProductBadgeProps) {
  const config = badgeConfig[type]

  return (
    <Badge
      className={cn(
        'font-semibold',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        config.className,
        className
      )}
    >
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  )
}

interface ProductBadgesProps {
  product: {
    is_bestseller?: boolean
    is_signature?: boolean
    is_new?: boolean
    is_vegan?: boolean
    is_vegetarian?: boolean
    is_spicy?: boolean
  }
  size?: 'sm' | 'md'
  className?: string
}

export function ProductBadges({ product, size = 'md', className }: ProductBadgesProps) {
  const badges: BadgeType[] = []

  if (product.is_bestseller) badges.push('bestseller')
  if (product.is_signature) badges.push('signature')
  if (product.is_new) badges.push('new')
  if (product.is_vegan) badges.push('vegan')
  else if (product.is_vegetarian) badges.push('vegetarian')

  if (badges.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {badges.map((type) => (
        <ProductBadge key={type} type={type} size={size} />
      ))}
    </div>
  )
}
