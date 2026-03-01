'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { useCartStore, CartItemAddon } from '@/stores/cartStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'
import { ALLERGENS, type AllergenKey } from '@/types/menu'
import { PRODUCT_BLUR_PLACEHOLDER } from '@/lib/product-image'

interface Variant {
  id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
}

interface Addon {
  id: string
  name: string
  price: number
  is_available: boolean
}

interface Product {
  id: string
  name: string
  name_jp?: string
  slug: string
  description?: string
  story?: string
  price: number
  original_price?: number
  image_url?: string
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
  allergens?: string[]
  calories?: number
  prep_time_min?: number
  prep_time_max?: number
  variants?: Variant[]
  addons?: Addon[]
  category?: {
    id: string
    name: string
    name_jp?: string
    slug: string
  }
}

interface ProductDetailsProps {
  product: Product
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const addItem = useCartStore((state) => state.addItem)

  const [quantity, setQuantity] = useState(1)
  const [selectedSpice, setSelectedSpice] = useState<1 | 2 | 3>(
    product.spice_level || 1
  )
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  )
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])

  const sortedVariants = product.variants?.sort((a, b) => a.sort_order - b.sort_order) || []

  const calculateTotal = () => {
    const basePrice = product.price
    const variantPrice = selectedVariant?.price || 0
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
    return (basePrice + variantPrice + addonsPrice) * quantity
  }



  const handleAddonToggle = (addon: Addon) => {
    setSelectedAddons((prev) =>
      prev.some((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  const handleAddToCart = () => {
    const cartAddons: CartItemAddon[] = selectedAddons.map((a) => ({
      id: a.id,
      name: a.name,
      price: a.price,
    }))

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image_url,
      spiceLevel: (product.has_spice_level || product.is_spicy) ? selectedSpice : undefined,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      variantPrice: selectedVariant?.price,
      addons: cartAddons,
    })

    toast.success(`${product.name} dodano do koszyka`, {
      description: `Ilość: ${quantity}`,
      duration: 3000,
    })
  }

  const spiceLevels = [
    { level: 1 as const, label: 'Łagodny', icon: 'whatshot' },
    { level: 2 as const, label: 'Średni', icon: 'local_fire_department' },
    { level: 3 as const, label: 'Piekielny', icon: 'flare' },
  ]

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-background/80 backdrop-blur-sm p-4 pb-2">
        <Link
          href="/"
          className="flex w-12 h-12 items-center justify-center rounded-full text-white hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="w-12" />
      </div>

      {/* Product image */}
      <div className="px-4 py-3">
        <div className="relative w-full min-h-80 rounded-xl overflow-hidden bg-card">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 672px"
              placeholder="blur"
              blurDataURL={PRODUCT_BLUR_PLACEHOLDER}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-background">
              <span className="text-8xl">🍜</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="px-4 flex-grow">
        {/* Title */}
        <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight pb-3 pt-6">
          {product.name}
        </h1>

        {/* Price with original price strikethrough */}
        <div className="flex items-baseline gap-3 pb-2">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-lg text-zinc-500 line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>

        {/* Calories */}
        {product.calories && (
          <p className="text-zinc-500 text-sm pb-2">
            {product.calories} kcal
          </p>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-zinc-400 text-base font-normal leading-normal pb-3 pt-1">
            {product.description}
          </p>
        )}

        {/* Story / Chef Quote */}
        {product.story && (
          <div className="my-4 p-4 bg-card/50 border-l-4 border-primary rounded-r-lg">
            <p className="text-zinc-300 italic text-sm leading-relaxed mb-2">
              &ldquo;{product.story}&rdquo;
            </p>
            <p className="text-primary text-xs font-medium">
              — Maciej Krawczun, Szef Kuchni MESO
            </p>
          </div>
        )}

        {/* Ingredients chips */}
        {product.allergens && product.allergens.length > 0 && (
          <div className="pt-2 pb-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {product.allergens.map((allergen) => (
                <div
                  key={allergen}
                  className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/20 px-4"
                >
                  <p className="text-primary text-sm font-medium leading-normal">
                    {ALLERGENS[allergen as AllergenKey] || allergen}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customization Section */}
        <div className="py-2 space-y-6">
          {/* Spiciness Level */}
          {(product.has_spice_level || product.is_spicy) && (
            <div>
              <h2 className="text-xl font-bold text-white mb-3">Poziom Ostrości</h2>
              <div className="grid grid-cols-3 gap-3">
                {spiceLevels.map((option) => (
                  <button
                    key={option.level}
                    onClick={() => setSelectedSpice(option.level)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                      selectedSpice === option.level
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <span className="text-2xl">
                      {option.level === 1 ? '🔥' : option.level === 2 ? '🔥🔥' : '🔥🔥🔥'}
                    </span>
                    <span className="text-sm font-semibold">{option.label}</span>
                  </button>
                ))}
              </div>
              {/* Piekielny Warning */}
              {selectedSpice === 3 && (
                <div className="mt-3 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <p className="text-orange-400 text-sm">
                    <strong>Poziom Piekielny to nie żart!</strong> Bardzo ostra wersja dla doświadczonych fanów chilli.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Size Variants */}
          {sortedVariants.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-3">Rozmiar</h2>
              <div className="grid grid-cols-2 gap-3">
                {sortedVariants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      selectedVariant?.id === variant.id
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <p className="font-medium">{variant.name}</p>
                    {variant.price > 0 && (
                      <p className="text-sm text-primary mt-1">
                        +{formatPrice(variant.price)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {product.addons && product.addons.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-3">Dodatki</h2>
              <div className="space-y-3">
                {product.addons.map((addon) => (
                  <label
                    key={addon.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg p-4 cursor-pointer transition-all',
                      selectedAddons.some((a) => a.id === addon.id)
                        ? 'bg-primary/10 border border-primary/50'
                        : 'bg-white/5 border border-transparent hover:border-border'
                    )}
                  >
                    <span className="text-white">
                      {addon.name}{' '}
                      <span className="text-zinc-400">(+{formatPrice(addon.price)})</span>
                    </span>
                    <Checkbox
                      checked={selectedAddons.some((a) => a.id === addon.id)}
                      onCheckedChange={() => handleAddonToggle(addon)}
                      className="h-6 w-6 rounded border-zinc-600 bg-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Spacer for fixed CTA */}
      <div className="h-32" />

      {/* Fixed CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background to-transparent p-4 pb-6">
        <button
          onClick={handleAddToCart}
          className={cn(
            'w-full h-14 flex items-center justify-center rounded-xl',
            'bg-primary text-white font-display font-bold text-lg',
            'neon-glow',
            'hover:neon-glow',
            'transition-all active:scale-95'
          )}
        >
          <span>Dodaj do koszyka</span>
          <span className="mx-2">·</span>
          <span>{formatPrice(calculateTotal())}</span>
        </button>
      </div>
    </div>
  )
}
