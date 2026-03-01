'use client'

import { useCartStore, selectSubtotal, selectDeliveryFee, selectDiscount, selectTotal } from '@/stores/cartStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'
import { Truck, Tag } from 'lucide-react'

export function CartSummary() {
  const subtotal = useCartStore(selectSubtotal)
  const deliveryFee = useCartStore(selectDeliveryFee)
  const discount = useCartStore(selectDiscount)
  const total = useCartStore(selectTotal)
  const tip = useCartStore((state) => state.tip)
  const promoCode = useCartStore((state) => state.promoCode)
  const promoDiscountType = useCartStore((state) => state.promoDiscountType)

  return (
    <div className={cn(
      'p-4 rounded-xl space-y-3',
      'bg-white/5 border border-border'
    )}>
      {/* Subtotal */}
      <div className="flex justify-between text-white/70">
        <span>Suma produktów</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {/* Delivery */}
      <div className="flex justify-between text-white/70">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>Dostawa</span>
        </div>
        <span className={promoDiscountType === 'free_delivery' ? 'text-primary line-through' : ''}>
          {deliveryFee === 0 && promoDiscountType === 'free_delivery' ? (
            <span className="text-primary no-underline">Gratis!</span>
          ) : deliveryFee === 0 ? (
            'Gratis'
          ) : (
            formatPrice(deliveryFee)
          )}
        </span>
      </div>

      {/* Discount */}
      {discount > 0 && (
        <div className="flex justify-between text-primary">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <span>Rabat ({promoCode})</span>
          </div>
          <span>-{formatPrice(discount)}</span>
        </div>
      )}

      {/* Tip */}
      {tip > 0 && (
        <div className="flex justify-between text-white/70">
          <span>Napiwek</span>
          <span>{formatPrice(tip)}</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border pt-3">
        {/* Total */}
        <div className="flex justify-between">
          <span className="text-white text-lg font-bold">Razem</span>
          <span className="text-primary text-xl font-bold">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}
