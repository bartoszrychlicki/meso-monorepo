'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { CartItem as CartItemType, useCartStore } from '@/stores/cartStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'
import { PRODUCT_BLUR_PLACEHOLDER } from '@/lib/product-image'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)



  const itemTotal = () => {
    const basePrice = item.price + (item.variantPrice || 0)
    const addonsPrice = item.addons.reduce((sum, addon) => sum + addon.price, 0)
    return (basePrice + addonsPrice) * item.quantity
  }

  const getSpiceEmoji = (level?: 1 | 2 | 3) => {
    if (!level) return null
    return level === 1 ? '🔥' : level === 2 ? '🔥🔥' : '🔥🔥🔥'
  }

  return (
    <div className={cn(
      'flex gap-4 p-4 rounded-xl',
      'bg-white/5 border border-border'
    )}>
      {/* Product Image */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-card flex-shrink-0">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="80px"
            placeholder="blur"
            blurDataURL={PRODUCT_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">🍜</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">{item.name}</h3>

        {/* Variant and options */}
        <div className="mt-1 space-y-0.5">
          {item.variantName && (
            <p className="text-white/50 text-sm">{item.variantName}</p>
          )}
          {item.spiceLevel && (
            <p className="text-white/50 text-sm">
              Ostrość: {getSpiceEmoji(item.spiceLevel)}
            </p>
          )}
          {item.addons.length > 0 && (
            <p className="text-white/50 text-sm truncate">
              + {item.addons.map(a => a.name).join(', ')}
            </p>
          )}
        </div>

        {/* Price and quantity */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-primary font-bold">{formatPrice(itemTotal())}</p>

          {/* Quantity controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => item.quantity === 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                'bg-white/10 text-white hover:bg-primary/20 hover:text-primary',
                'transition-colors'
              )}
            >
              {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>

            <span className="w-8 text-center text-white font-medium">
              {item.quantity}
            </span>

            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                'bg-primary text-white hover:bg-primary/90',
                'neon-glow-sm',
                'transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
