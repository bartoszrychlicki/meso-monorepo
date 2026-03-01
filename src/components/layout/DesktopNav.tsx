'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ClipboardList, User, Trophy, ShoppingCart } from 'lucide-react'
import { useCartStore, selectItemCount, selectSubtotal } from '@/stores/cartStore'
import { formatPrice } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Menu', icon: Home },
  { path: '/search', label: 'Szukaj', icon: Search },
  { path: '/orders', label: 'Zamówienia', icon: ClipboardList },
  { path: '/loyalty', label: 'Punkty', icon: Trophy },
  { path: '/account', label: 'Profil', icon: User },
]

export function DesktopNav() {
  const pathname = usePathname()
  const totalItems = useCartStore(selectItemCount)
  const subtotal = useCartStore(selectSubtotal)

  return (
    <header
      data-testid="desktop-nav"
      className="fixed top-0 left-0 right-0 z-40 hidden lg:block glass border-b border-border"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-widest text-primary neon-text"
        >
          MESO
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
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
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side: Cart */}
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 neon-border"
          >
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 ? (
              <>
                <span>{formatPrice(subtotal)}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {totalItems}
                </span>
              </>
            ) : (
              <span>Koszyk</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
