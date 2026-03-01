'use client'

import Link from 'next/link'
import Image from 'next/image'
import { RotateCcw, Plus } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/formatters'
import { getProductImageUrl, PRODUCT_BLUR_PLACEHOLDER, ProductImage } from '@/lib/product-image'

interface UpsellProduct {
  id: string
  name: string
  price: number
  image_url?: string
  images?: ProductImage[]
  category_id: string
  slug?: string
}

function MiniCard({ product }: { product: UpsellProduct }) {
  const imageUrl = getProductImageUrl(product)

  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      className="group shrink-0 w-28 rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/30"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="112px"
            placeholder="blur"
            blurDataURL={PRODUCT_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-3xl">
            🍜
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-80 group-hover:opacity-100 transition-opacity">
          <Plus className="h-3 w-3" />
        </div>
      </div>
      <div className="p-2">
        <p className="text-primary text-xs font-semibold">
          {formatPrice(product.price)}
        </p>
        <p className="text-[11px] text-foreground font-medium truncate">
          {product.name}
        </p>
      </div>
    </Link>
  )
}

interface CartUpsellProps {
  allProducts?: UpsellProduct[]
}

export function CartUpsell({ allProducts = [] }: CartUpsellProps) {
  const items = useCartStore((s) => s.items)
  const { isPermanent } = useAuth()

  if (items.length === 0 || allProducts.length === 0) return null

  const cartProductIds = new Set(items.map((i) => i.productId))
  const cartCategories = new Set(
    allProducts
      .filter((p) => cartProductIds.has(p.id))
      .map((p) => p.category_id)
  )

  // Suggest items not in cart from categories not represented
  const suggestions = allProducts
    .filter((p) => !cartProductIds.has(p.id))
    .slice(0, 6)

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-sm font-bold tracking-wider text-foreground mb-3">
          🔔 Nie zapomnij o
        </h3>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
          {suggestions.map((product) => (
            <MiniCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
