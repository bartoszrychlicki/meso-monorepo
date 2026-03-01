'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore, selectItemCount, selectTotal } from '@/stores/cartStore'
import { CartItem, CartSummary, PromoCodeInput } from '@/components/cart'
import { EmptyState } from '@/components/common/EmptyState'
import { AnonymousBanner } from '@/components/auth'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatters'

export default function CartPage() {
  const router = useRouter()
  const { isPermanent } = useAuth()
  const items = useCartStore((state) => state.items)
  const itemCount = useCartStore(selectItemCount)
  const canCheckout = useCartStore((state) => state.canCheckout)
  const total = useCartStore(selectTotal)

  useEffect(() => {
    async function syncCoupon() {
      try {
        const res = await fetch('/api/loyalty/active-coupon')
        const { coupon } = await res.json()
        const storeCoupon = useCartStore.getState().loyaltyCoupon

        if (coupon && !storeCoupon) {
          // DB has active coupon but store doesn't — restore it
          useCartStore.getState().setLoyaltyCoupon(coupon)
        } else if (!coupon && storeCoupon) {
          // Store has coupon but it expired in DB — clear it
          useCartStore.getState().clearLoyaltyCoupon()
        }
      } catch {
        // Silently fail — non-critical
      }
    }
    syncCoupon()
  }, [])

  const checkout = canCheckout()

  if (items.length === 0) {
    return (
      <EmptyState
        type="cart"
        action={{ label: 'PRZEGLĄDAJ MENU', href: '/' }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć
      </button>

      <h1 className="mb-6 font-display text-xl font-bold tracking-wider">
        TWÓJ KOSZYK
      </h1>

      {/* Items count */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-foreground font-semibold">
          {itemCount}{' '}
          {itemCount === 1
            ? 'produkt'
            : itemCount < 5
            ? 'produkty'
            : 'produktów'}
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-3 mb-6">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <CartItem item={item} />
          </motion.div>
        ))}
      </div>

      {/* Promo Code */}
      <div className="mb-6">
        <h2 className="text-foreground font-semibold mb-3">Kod promocyjny</h2>
        <PromoCodeInput />
      </div>

      {/* Summary */}
      <CartSummary />

      {/* Anonymous Banner */}
      <div className="mt-6">
        <AnonymousBanner variant="checkout" />
      </div>

      {/* Min order warning */}
      {!checkout.allowed && checkout.reason && (
        <div
          className={cn(
            'mt-4 p-4 rounded-lg text-center',
            'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500'
          )}
        >
          {checkout.reason}
        </div>
      )}

      {/* Legal info */}
      <p className="mt-4 text-center text-muted-foreground text-xs">
        Składając zamówienie akceptujesz{' '}
        <Link href="/regulamin" className="text-primary hover:underline">
          Regulamin
        </Link>{' '}
        oraz{' '}
        <Link
          href="/polityka-prywatnosci"
          className="text-primary hover:underline"
        >
          Politykę Prywatności
        </Link>
      </p>

      {/* Fixed CTA Button */}
      <div className="fixed bottom-[85px] left-0 right-0 z-50 mx-4 lg:relative lg:bottom-auto lg:mx-0 lg:mt-6">
        <div className="bg-background border border-border p-4 rounded-2xl shadow-xl lg:p-0 lg:border-0 lg:shadow-none lg:bg-transparent">
          <Link
            data-testid="cart-checkout-link"
            href={checkout.allowed ? (isPermanent ? '/checkout' : '/login?redirect=/checkout') : '#'}
            onClick={(e) => !checkout.allowed && e.preventDefault()}
            className={cn(
              'block w-full rounded-xl py-4 text-center font-display text-sm font-semibold tracking-wider transition-all',
              checkout.allowed
                ? 'bg-accent text-accent-foreground neon-glow-yellow hover:scale-[1.02]'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            {checkout.allowed && !isPermanent ? 'ZALOGUJ SIĘ I ZAMÓW' : `ZAMÓW \u2022 ${formatPrice(total)}`}
          </Link>
        </div>
      </div>
    </div>
  )
}
