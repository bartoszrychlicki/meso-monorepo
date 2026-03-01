'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { useCartStore, type CartItemAddon } from '@/stores/cartStore'
import { formatPrice } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { PRODUCT_BLUR_PLACEHOLDER } from '@/lib/product-image'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { ALLERGENS, type AllergenKey } from '@/types/menu'
import { toast } from 'sonner'

interface Variant {
  id: string
  name: string
  price_modifier: number
  is_default: boolean
  sort_order: number
}

interface Addon {
  id: string
  name: string
  price: number
  is_active: boolean
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
  variants?: Variant[] | null
  addons?: Addon[] | null
  category?: {
    id: string
    name: string
    slug: string
    icon?: string
  } | null
}

interface ProductDetailClientProps {
  product: Product
}

const badgeStyles: Record<string, string> = {
  bestseller: 'bg-primary/20 text-primary border-primary/30',
  premium: 'bg-accent/20 text-accent border-accent/30',
  nowosc: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30',
  ostre: 'bg-destructive/20 text-destructive border-destructive/30',
}

const spiceLevels = [
  { level: 1 as const, label: 'Łagodny', emoji: '\u{1F525}' },
  { level: 2 as const, label: 'Średni', emoji: '\u{1F525}\u{1F525}' },
  { level: 3 as const, label: 'Piekielny', emoji: '\u{1F525}\u{1F525}\u{1F525}' },
]

const categoryEmojiMap: Record<string, string> = {
  ramen: '\u{1F35C}',
  gyoza: '\u{1F95F}',
  karaage: '\u{1F357}',
  dodatki: '\u{1F35A}',
  napoje: '\u{1F964}',
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)

  const [quantity, setQuantity] = useState(1)
  const [selectedSpice, setSelectedSpice] = useState<1 | 2 | 3>(
    product.spice_level || 2
  )
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.find((v) => v.is_default) || product.variants?.[0] || null
  )
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])
  const [notes, setNotes] = useState('')

  const sortedVariants = [...(product.variants || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  const activeAddons = (product.addons || []).filter((a) => a.is_active)

  const handleAddonToggle = (addon: Addon) => {
    setSelectedAddons((prev) =>
      prev.some((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  const calculateTotal = () => {
    const basePrice = product.price
    const variantPrice = selectedVariant?.price_modifier || 0
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0)
    return (basePrice + variantPrice + addonsPrice) * quantity
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
      spiceLevel: product.has_spice_level ? selectedSpice : undefined,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      variantPrice: selectedVariant?.price_modifier,
      addons: cartAddons,
      notes: notes.trim() || undefined,
    })

    toast.success(`${product.name} dodano do koszyka`, {
      description: `Ilość: ${quantity}`,
      duration: 3000,
    })

    router.back()
  }

  const badges: { key: string; label: string }[] = []
  if (product.is_bestseller) badges.push({ key: 'bestseller', label: 'Bestseller' })
  if (product.is_signature) badges.push({ key: 'premium', label: 'Premium' })
  if (product.is_new) badges.push({ key: 'nowosc', label: 'Nowość' })

  const fallbackEmoji = product.category?.slug
    ? categoryEmojiMap[product.category.slug] || '\u{1F35C}'
    : '\u{1F35C}'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl min-h-screen pb-32 bg-background"
    >
      {/* Back button */}
      <div className="sticky top-0 z-50 flex items-center bg-background/80 backdrop-blur-sm p-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Wróć</span>
        </button>
      </div>

      {/* Hero image */}
      <div className="px-4 pb-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
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
              <span className="text-8xl">{fallbackEmoji}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-6">
        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge.key}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                  badgeStyles[badge.key]
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Name & Japanese name */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {product.name}
          </h1>
          {product.name_jp && (
            <p className="mt-1 font-japanese text-sm text-muted-foreground">
              {product.name_jp}
            </p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>

        {/* Calories */}
        {product.calories && (
          <p className="text-sm text-muted-foreground">
            {product.calories} kcal
          </p>
        )}

        {/* Allergens */}
        {product.allergens && product.allergens.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {product.allergens.map((allergen) => (
              <span
                key={allergen}
                className="shrink-0 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary"
              >
                {ALLERGENS[allergen as AllergenKey] || allergen}
              </span>
            ))}
          </div>
        )}

        {/* Story / Chef Quote */}
        {product.story && (
          <div className="p-4 bg-card/50 border-l-4 border-primary rounded-r-lg">
            <p className="italic text-sm leading-relaxed text-muted-foreground mb-2">
              &ldquo;{product.story}&rdquo;
            </p>
            <p className="text-primary text-xs font-medium">
              -- Maciej Krawczun, Szef Kuchni MESO
            </p>
          </div>
        )}

        {/* Spice level selector */}
        {product.has_spice_level && (
          <div>
            <h2 className="font-display text-lg font-bold text-foreground mb-3">
              Poziom Ostrości
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {spiceLevels.map((option) => (
                <button
                  key={option.level}
                  type="button"
                  onClick={() => setSelectedSpice(option.level)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all',
                    selectedSpice === option.level
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-sm font-semibold">{option.label}</span>
                </button>
              ))}
            </div>
            {selectedSpice === 3 && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                <span className="text-lg">&#9888;&#65039;</span>
                <p className="text-destructive text-sm">
                  <strong>Poziom Piekielny to nie żart!</strong> Bardzo ostra wersja dla doświadczonych fanów chilli.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Variant selector */}
        {product.has_variants && sortedVariants.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold text-foreground mb-3">
              Rozmiar
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {sortedVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariant(variant)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    selectedVariant?.id === variant.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <p className="font-medium text-foreground">{variant.name}</p>
                  {variant.price_modifier > 0 && (
                    <p className="text-sm text-primary mt-1">
                      +{formatPrice(variant.price_modifier)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Addon selector */}
        {product.has_addons && activeAddons.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold text-foreground mb-3">
              Dodatki
            </h2>
            <div className="space-y-3">
              {activeAddons.map((addon) => (
                <label
                  key={addon.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl p-4 cursor-pointer transition-all',
                    selectedAddons.some((a) => a.id === addon.id)
                      ? 'bg-primary/10 border border-primary/50'
                      : 'bg-secondary/30 border border-transparent hover:border-border'
                  )}
                >
                  <span className="text-foreground">
                    {addon.name}{' '}
                    <span className="text-muted-foreground">
                      (+{formatPrice(addon.price)})
                    </span>
                  </span>
                  <Checkbox
                    checked={selectedAddons.some((a) => a.id === addon.id)}
                    onCheckedChange={() => handleAddonToggle(addon)}
                    className="h-6 w-6 rounded border-border bg-secondary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Notes textarea */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3">
            Uwagi do zamówienia
          </h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Np. bez cebuli, dodatkowy sos..."
            className="bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background/95 to-transparent p-4 pb-6">
        <div className="mx-auto max-w-2xl flex items-center gap-4">
          {/* Quantity selector */}
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-foreground hover:text-primary transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-display font-bold text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="text-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            type="button"
            data-testid="product-detail-add-to-cart"
            aria-label="Dodaj produkt do koszyka"
            onClick={handleAddToCart}
            className={cn(
              'flex-1 rounded-xl py-3.5 font-display text-sm font-semibold tracking-wider',
              'bg-accent text-accent-foreground',
              'neon-glow-yellow',
              'transition-all hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            DODAJ &bull; {formatPrice(calculateTotal())}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
