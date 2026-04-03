'use client'

import { useCartStore, selectSubtotal, selectDeliveryFee, selectDiscount, selectTotal } from '@/stores/cartStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'
import { Truck, Tag } from 'lucide-react'
import { useDeliveryI18n } from '@/lib/i18n/provider'

export function CartSummary() {
  const subtotal = useCartStore(selectSubtotal)
  const deliveryFee = useCartStore(selectDeliveryFee)
  const discount = useCartStore(selectDiscount)
  const total = useCartStore(selectTotal)
  const tip = useCartStore((state) => state.tip)
  const promoCode = useCartStore((state) => state.promoCode)
  const promoDiscountType = useCartStore((state) => state.promoDiscountType)
  const { t } = useDeliveryI18n()

  return (
    <div className={cn(
      'p-4 pb-36 lg:pb-4 rounded-xl space-y-3',
      'bg-white/5 border border-border'
    )}>
      {/* Subtotal */}
      <div className="flex justify-between text-white/70">
        <span>{t('cart.productsTotal')}</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {/* Delivery */}
      <div className="flex justify-between text-white/70">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>{t('cart.delivery')}</span>
        </div>
        <span className={promoDiscountType === 'free_delivery' ? 'text-primary line-through' : ''}>
          {deliveryFee === 0 && promoDiscountType === 'free_delivery' ? (
            <span className="text-primary no-underline">{t('cart.free')}!</span>
          ) : deliveryFee === 0 ? (
            t('cart.free')
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
            <span>{t('cart.discount')} ({promoCode})</span>
          </div>
          <span>-{formatPrice(discount)}</span>
        </div>
      )}

      {/* Tip */}
      {tip > 0 && (
        <div className="flex justify-between text-white/70">
          <span>{t('cart.tip')}</span>
          <span>{formatPrice(tip)}</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border pt-3">
        {/* Total */}
        <div className="flex justify-between">
          <span className="text-white text-lg font-bold">{t('cart.total')}</span>
          <span className="text-primary text-xl font-bold">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}
