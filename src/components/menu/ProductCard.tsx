'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'
import { getProductImageUrl, PRODUCT_BLUR_PLACEHOLDER, ProductImage } from '@/lib/product-image'
import { useCartStore } from '@/stores/cartStore'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  name_jp?: string
  slug: string
  description?: string
  price: number
  original_price?: number
  image_url?: string
  images?: ProductImage[]
  is_spicy?: boolean
  spice_level?: 1 | 2 | 3
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_bestseller?: boolean
  is_signature?: boolean
  is_new?: boolean
  has_variants?: boolean
  has_addons?: boolean
  has_spice_level?: boolean
}

const badgeStyles: Record<string, string> = {
  bestseller: 'bg-primary/20 text-primary border-primary/30',
  premium: 'bg-accent/20 text-accent border-accent/30',
  nowosc: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30',
  ostre: 'bg-destructive/20 text-destructive border-destructive/30',
}

const badgeLabels: Record<string, string> = {
  bestseller: 'Bestseller',
  premium: 'Premium',
  nowosc: 'Nowość',
  ostre: 'Ostre 🌶️',
}

function mapProductToBadges(product: Product): string[] {
  const badges: string[] = []
  if (product.is_bestseller) badges.push('bestseller')
  if (product.is_signature) badges.push('premium')
  if (product.is_new) badges.push('nowosc')
  if (product.is_spicy) badges.push('ostre')
  return badges
}

interface ProductCardProps {
  product: Product
  compact?: boolean
  quickAdd?: boolean
  className?: string
}

export function ProductCard({
  product,
  compact = false,
  quickAdd = false,
  className,
}: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const badges = mapProductToBadges(product)
  const imageUrl = getProductImageUrl(product)

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: imageUrl,
      addons: [],
    })
    toast.success(`${product.name} dodano do koszyka`)
  }

  if (compact) {
    return (
      <Link
        href={`/product/${product.slug || product.id}`}
        className={cn(
          'group flex-shrink-0 w-36 sm:w-auto block rounded-xl border border-border bg-card p-2 transition-all hover:border-primary/30 hover:neon-glow-sm',
          className
        )}
      >
        <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-secondary">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="144px"
              placeholder="blur"
              blurDataURL={PRODUCT_BLUR_PLACEHOLDER}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-3xl">
              🍜
            </div>
          )}
          {badges.length > 0 && (
            <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
              {badges.slice(0, 1).map((b) => (
                <span
                  key={b}
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                    badgeStyles[b]
                  )}
                >
                  {badgeLabels[b]}
                </span>
              ))}
            </div>
          )}
        </div>
        <h3 className="mb-0.5 font-display text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-sm font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-[10px] font-medium text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
          <button
            onClick={quickAdd ? handleQuickAdd : undefined}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform group-hover:scale-110"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      className={cn(
        'group block rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:neon-glow-sm',
        className
      )}
    >
      {/* Image */}
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL={PRODUCT_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">
            🍜
          </div>
        )}
        {/* Badges */}
        {badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  badgeStyles[b]
                )}
              >
                {badgeLabels[b]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="mb-1 font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {product.name}
      </h3>
      {product.description && (
        <p className="mb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {product.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-bold text-foreground">
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm font-medium text-muted-foreground line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
        <button
          onClick={quickAdd ? handleQuickAdd : undefined}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </Link>
  )
}
