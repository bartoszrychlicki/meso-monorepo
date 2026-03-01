'use client'

import Link from 'next/link'
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore, selectItemCount, selectSubtotal } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/formatters'
import { LoyaltyBox } from './LoyaltyBox'

export function CartSidebar() {
  const { isPermanent } = useAuth()
  const items = useCartStore((s) => s.items)
  const totalItems = useCartStore(selectItemCount)
  const subtotal = useCartStore(selectSubtotal)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="sticky top-20 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-display text-sm font-semibold tracking-wider">
            KOSZYK
          </h2>
          {totalItems > 0 && (
            <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              {totalItems}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-30" />
            Twój koszyk jest pusty
          </div>
        ) : (
          <>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto scrollbar-hide">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      {(item.addons || []).length > 0 && (
                        <div className="mt-0.5">
                          {(item.addons || []).map((addon) => (
                            <span
                              key={addon.id}
                              className="mr-1 text-[10px] text-muted-foreground"
                            >
                              +{addon.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.variantName && (
                        <span className="text-[10px] text-muted-foreground">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {formatPrice(
                        (item.price +
                          (item.variantPrice || 0) +
                          (item.addons || []).reduce((s, a) => s + a.price, 0)) *
                          item.quantity
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded bg-muted text-foreground hover:bg-primary/20"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded bg-muted text-foreground hover:bg-primary/20"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between font-display text-base font-bold text-foreground">
                <span>Razem</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>

            <Link
              href={isPermanent ? '/checkout' : '/login?redirect=/checkout'}
              className="mt-4 block w-full rounded-lg bg-accent py-3 text-center font-display text-sm font-semibold tracking-wider text-accent-foreground transition-all neon-glow-yellow hover:scale-[1.02]"
            >
              {isPermanent ? `ZAMÓW \u2022 ${formatPrice(subtotal)}` : 'ZALOGUJ SIĘ I ZAMÓW'}
            </Link>
          </>
        )}
      </div>
      <LoyaltyBox />
    </div>
  )
}
