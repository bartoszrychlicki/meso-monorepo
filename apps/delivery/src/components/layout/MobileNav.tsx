'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, ClipboardList, User } from 'lucide-react'
import { useCartStore, selectItemCount, selectSubtotal } from '@/stores/cartStore'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const baseNavItems = [
  { path: '/', label: 'Menu', icon: Home },
  { path: '/loyalty', label: 'Punkty', icon: Trophy },
  { path: '/orders', label: 'Zamówienia', icon: ClipboardList },
]

export function MobileNav() {
  const pathname = usePathname()
  const totalItems = useCartStore(selectItemCount)
  const subtotal = useCartStore(selectSubtotal)

  const hideCart =
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname.startsWith('/product/')

  const navItems = [...baseNavItems, { path: '/account', label: 'Profil', icon: User }]

  return (
    <>
      {/* Floating cart bar */}
      <AnimatePresence>
        {totalItems > 0 && !hideCart && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-[4.5rem] left-3 right-3 z-50 lg:hidden"
          >
            <Link
              href="/cart"
              className="flex items-center justify-between rounded-xl bg-accent px-4 py-2.5 neon-glow-yellow"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-foreground/15 text-[11px] font-bold text-accent-foreground">
                  {totalItems}
                </span>
                <span className="font-display text-xs font-semibold tracking-wide text-accent-foreground">
                  Zobacz zamówienie
                </span>
              </div>
              <span className="font-display text-xs font-bold text-accent-foreground">
                {formatPrice(subtotal)}
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <nav
        data-testid="mobile-nav"
        className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border lg:hidden pb-safe"
      >
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.path ||
              (item.path !== '/' && pathname.startsWith(item.path))

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'neon-text')} />
                <span className="font-body">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
