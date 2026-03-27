'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, Clock, Minus, Plus } from 'lucide-react'
import { useCartStore, type CartItemAddon } from '@/stores/cartStore'
import { formatPrice, formatPriceDelta } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { getProductImageUrl, PRODUCT_BLUR_PLACEHOLDER, type ProductImage } from '@/lib/product-image'
import { Badge } from '@/components/ui/badge'
import { getAllergenLabel } from '@/types/menu'
import { toast } from 'sonner'

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

interface ModifierOption {
  id: string
  name: string
  price: number
  is_available?: boolean
  sort_order?: number
}

interface ModifierGroup {
  id: string
  name: string
  required?: boolean
  min_selections?: number
  max_selections?: number
  modifiers: ModifierOption[]
}

interface NutritionalInfo {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export interface ProductDetailProduct {
  id: string
  name: string
  name_jp?: string
  slug: string
  description?: string
  story?: string
  price: number
  original_price?: number | null
  promo_label?: string | null
  image_url?: string
  images?: ProductImage[] | string | null
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  allergens?: string[]
  calories?: number
  nutritional_info?: NutritionalInfo | null
  prep_time_min?: number
  prep_time_max?: number
  preparation_time_minutes?: number
  is_available?: boolean
  is_hidden_in_menu?: boolean
  variants?: Variant[] | null
  addons?: Addon[] | null
  tags?: string[] | null
  modifier_groups?: ModifierGroup[] | null
  category?: {
    id: string
    name: string
    slug: string
    icon?: string | null
  } | null
}

interface ProductDetailClientProps {
  product: ProductDetailProduct
}

const categoryEmojiMap: Record<string, string> = {
  ramen: '\u{1F35C}',
  rameny: '\u{1F35C}',
  gyoza: '\u{1F95F}',
  karaage: '\u{1F357}',
  dodatki: '\u{1F35A}',
  przekaski: '\u{1F95F}',
  napoje: '\u{1F964}',
  desery: '\u{1F361}',
}

function toPositiveNumber(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number(value)
      : NaN

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatNutritionValue(value: number): string {
  return value.toLocaleString('pl-PL', { maximumFractionDigits: 1 })
}

function resolvePrepTimeLabel(product: ProductDetailProduct): string | null {
  const prepTime = toPositiveNumber(product.preparation_time_minutes)
  const prepMin = toPositiveNumber(product.prep_time_min)
  const prepMax = toPositiveNumber(product.prep_time_max)

  if (prepMin !== null && prepMax !== null) {
    return prepMin === prepMax ? `${prepMin} min` : `${prepMin}-${prepMax} min`
  }

  if (prepMin !== null) return `${prepMin} min`
  if (prepMax !== null) return `${prepMax} min`
  if (prepTime !== null) return `${prepTime} min`

  return null
}

function normalizeModifierGroups(product: ProductDetailProduct): ModifierGroup[] {
  const groups = product.modifier_groups || []

  const normalizedGroups = groups
    .map((group) => ({
      ...group,
      modifiers: [...(group.modifiers || [])]
        .filter((option) => option.is_available !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
    .filter((group) => group.modifiers.length > 0)

  if (normalizedGroups.length > 0) return normalizedGroups

  const activeAddons = (product.addons || []).filter((addon) => addon.is_available !== false)
  if (activeAddons.length === 0) return []

  return [
    {
      id: 'addons',
      name: 'Dodatki',
      required: false,
      min_selections: 0,
      max_selections: activeAddons.length,
      modifiers: activeAddons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        is_available: addon.is_available,
      })),
    },
  ]
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)
  const imageUrl = getProductImageUrl(product)

  const [quantity, setQuantity] = useState(1)
  const [storyOpen, setStoryOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  )

  const sortedVariants = [...(product.variants || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  const modifierGroups = normalizeModifierGroups(product)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, ModifierOption[]>>(
    () => {
      const defaults: Record<string, ModifierOption[]> = {}

      for (const group of modifierGroups) {
        const minSelections = Math.max(0, group.min_selections ?? (group.required ? 1 : 0))
        if (minSelections === 0) continue

        const maxSelections = Math.max(1, group.max_selections ?? 1)
        const selected = group.modifiers.slice(0, Math.min(minSelections, maxSelections))
        if (selected.length > 0) {
          defaults[group.id] = selected
        }
      }

      return defaults
    }
  )

  const calories =
    toPositiveNumber(product.calories) ??
    toPositiveNumber(product.nutritional_info?.calories)
  const prepTimeLabel = resolvePrepTimeLabel(product)
  const hasDietBadges = Boolean(
    product.is_vegetarian || product.is_vegan || product.is_gluten_free
  )

  const tags = (product.tags || []).filter(Boolean)
  const hasPromotion = Boolean(product.original_price && product.original_price > product.price)
  const promotionLabel = product.promo_label?.trim() || 'Promocja'
  const promoSavings = hasPromotion ? (product.original_price as number) - product.price : 0
  const isUnavailable = product.is_available === false

  const nutritionItems = [
    calories !== null ? { label: 'kcal', value: formatNutritionValue(calories) } : null,
    toPositiveNumber(product.nutritional_info?.protein) !== null
      ? {
          label: 'białko',
          value: `${formatNutritionValue(toPositiveNumber(product.nutritional_info?.protein) || 0)}g`,
        }
      : null,
    toPositiveNumber(product.nutritional_info?.carbs) !== null
      ? {
          label: 'węgle',
          value: `${formatNutritionValue(toPositiveNumber(product.nutritional_info?.carbs) || 0)}g`,
        }
      : null,
    toPositiveNumber(product.nutritional_info?.fat) !== null
      ? {
          label: 'tłuszcz',
          value: `${formatNutritionValue(toPositiveNumber(product.nutritional_info?.fat) || 0)}g`,
        }
      : null,
    toPositiveNumber(product.nutritional_info?.fiber) !== null
      ? {
          label: 'błonnik',
          value: `${formatNutritionValue(toPositiveNumber(product.nutritional_info?.fiber) || 0)}g`,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null)

  const nutritionGridColsClass =
    nutritionItems.length >= 5
      ? 'grid-cols-5'
      : nutritionItems.length === 4
      ? 'grid-cols-4'
      : nutritionItems.length === 3
      ? 'grid-cols-3'
      : nutritionItems.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-1'

  const selectedAddons = Object.values(selectedModifiers).flat()

  const calculateTotal = () => {
    const basePrice = product.price
    const variantPrice = selectedVariant?.price || 0
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
    return (basePrice + variantPrice + addonsPrice) * quantity
  }

  const toggleModifier = (
    groupId: string,
    option: ModifierOption,
    maxSelections: number
  ) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || []
      const exists = current.some((selected) => selected.id === option.id)

      if (exists) {
        return { ...prev, [groupId]: current.filter((selected) => selected.id !== option.id) }
      }

      if (maxSelections <= 1) {
        return { ...prev, [groupId]: [option] }
      }

      if (current.length >= maxSelections) return prev

      return { ...prev, [groupId]: [...current, option] }
    })
  }

  const handleAddToCart = () => {
    if (isUnavailable) {
      toast.error('Produkt chwilowo niedostępny')
      return
    }

    const cartAddons: CartItemAddon[] = selectedAddons.map((addon) => ({
      id: addon.id,
      name: addon.name,
      price: addon.price,
    }))

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: imageUrl,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      variantPrice: selectedVariant?.price,
      addons: cartAddons,
    })

    toast.success(`${product.name} dodano do koszyka`, {
      description: `Ilość: ${quantity}`,
      duration: 3000,
    })

    router.back()
  }

  const fallbackEmoji = product.category?.slug
    ? categoryEmojiMap[product.category.slug] || '\u{1F35C}'
    : '\u{1F35C}'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto min-h-screen max-w-2xl px-4 py-4 pb-40"
    >
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć
      </button>

      <div className="relative mb-6 aspect-video overflow-hidden rounded-2xl bg-secondary">
        {imageUrl ? (
          <Image
            src={imageUrl}
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

      <h1 className="mb-1 font-display text-2xl font-bold text-foreground">{product.name}</h1>
      {product.name_jp && (
        <p className="mb-2 font-japanese text-sm text-muted-foreground/70">{product.name_jp}</p>
      )}

      {product.description && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      )}

      <div className="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('font-display font-bold text-foreground', hasPromotion ? 'text-3xl' : 'text-2xl')}>
            {formatPrice(product.price)}
          </span>
          {hasPromotion && (
            <>
              <span className="text-base font-medium text-muted-foreground line-through">
                {formatPrice(product.original_price as number)}
              </span>
              <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                {promotionLabel}
              </Badge>
            </>
          )}
        </div>
        {hasPromotion && promoSavings > 0 && (
          <p className="mt-1 text-xs font-medium text-emerald-400">
            Oszczędzasz {formatPrice(promoSavings)}
          </p>
        )}
      </div>

      {(hasDietBadges || prepTimeLabel) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {product.is_vegan && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              🌿 Vegan
            </span>
          )}
          {product.is_vegetarian && !product.is_vegan && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
              🌱 Vege
            </span>
          )}
          {product.is_gluten_free && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
              🚫 Gluten Free
            </span>
          )}
          {prepTimeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Clock className="h-3 w-3" />
              {prepTimeLabel}
            </span>
          )}
        </div>
      )}

      {isUnavailable && (
        <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Produkt chwilowo niedostępny. Mozesz zobaczyc opis i sklad, ale nie dodasz go teraz do koszyka.
        </div>
      )}

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {product.allergens && product.allergens.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alergeny
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {product.allergens.map((allergen) => (
              <Badge key={allergen} variant="destructive" className="text-[11px] font-normal">
                {getAllergenLabel(allergen)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {nutritionItems.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Wartości odżywcze
          </h3>
          <div className={cn('grid gap-2', nutritionGridColsClass)}>
            {nutritionItems.map((nutrition) => (
              <div key={nutrition.label} className="rounded-xl bg-secondary/50 p-2 text-center">
                <div className="font-display text-sm font-bold text-foreground">
                  {nutrition.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{nutrition.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {product.story && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setStoryOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl bg-secondary/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            <span className="font-display text-xs font-semibold uppercase tracking-wider">
              Historia dania
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                storyOpen && 'rotate-180'
              )}
            />
          </button>
          {storyOpen && (
            <div className="px-4 pt-3 text-sm leading-relaxed text-muted-foreground">
              {product.story}
            </div>
          )}
        </div>
      )}

      {sortedVariants.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Wybierz opcję
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {sortedVariants.map((variant) => {
              const variantPriceDelta = formatPriceDelta(variant.price)

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariant(variant)}
                  className={cn(
                    'rounded-xl border p-3 text-left text-sm transition-all',
                    selectedVariant?.id === variant.id
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border bg-secondary/30 text-foreground hover:border-primary/30'
                  )}
                >
                  <span>{variant.name}</span>
                  {variantPriceDelta && (
                    <span className="block text-muted-foreground">{variantPriceDelta}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {modifierGroups.map((group) => {
        const maxSelections = Math.max(1, group.max_selections ?? 1)

        return (
          <div key={group.id} className="mb-6">
            <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.name} {group.required && <span className="text-destructive">*</span>}
            </h3>
            <div className="space-y-2">
              {group.modifiers.map((option) => {
                const isSelected = (selectedModifiers[group.id] || []).some(
                  (selected) => selected.id === option.id
                )

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleModifier(group.id, option, maxSelections)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border p-3 text-sm transition-all',
                      isSelected
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-secondary/30 text-foreground hover:border-primary/30'
                    )}
                  >
                    <span>{option.name}</span>
                    {option.price > 0 && (
                      <span className="text-muted-foreground">+{formatPrice(option.price)}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-6 pt-3">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 neon-border">
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="text-foreground disabled:text-muted-foreground"
                disabled={isUnavailable}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-display font-bold text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="text-foreground disabled:text-muted-foreground"
                disabled={isUnavailable}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              data-testid="product-detail-add-to-cart"
              aria-label="Dodaj produkt do koszyka"
              onClick={handleAddToCart}
              disabled={isUnavailable}
              className={cn(
                'flex-1 rounded-xl py-3 font-display text-sm font-semibold tracking-wider transition-all',
                isUnavailable
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground neon-glow hover:scale-[1.02]'
              )}
            >
              {isUnavailable ? 'NIEDOSTĘPNE' : `DODAJ • ${formatPrice(calculateTotal())}`}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
