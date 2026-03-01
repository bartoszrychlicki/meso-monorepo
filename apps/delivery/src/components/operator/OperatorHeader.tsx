'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, ChefHat, UtensilsCrossed, LayoutDashboard, LogOut, Settings, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'

export function OperatorHeader() {
    const pathname = usePathname()
    const { logout } = useOperatorAuthStore()

    return (
        <header className="sticky top-0 z-50 bg-meso-dark-900 border-b border-white/5">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/operator/orders" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-meso-red-500 rounded-lg flex items-center justify-center">
                            <ChefHat className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">MESO Kitchen</h1>
                            <p className="text-xs text-white/50">Kucharz Cyfrowy</p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        {/* Current Time */}
                        <CurrentTime />

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            title="Wyloguj"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex gap-1 pb-2">
                    <NavLink href="/operator/orders" active={pathname === '/operator/orders'}>
                        <LayoutDashboard className="w-4 h-4" />
                        Zamówienia
                    </NavLink>
                    <NavLink href="/operator/stats" active={pathname === '/operator/stats'}>
                        <UtensilsCrossed className="w-4 h-4" />
                        Statystyki
                    </NavLink>
                    <NavLink href="/operator/promo-codes" active={pathname.startsWith('/operator/promo-codes')}>
                        <Tag className="w-4 h-4" />
                        Kody promo
                    </NavLink>
                    <NavLink href="/operator/settings" active={pathname.startsWith('/operator/settings')}>
                        <Settings className="w-4 h-4" />
                        Ustawienia
                    </NavLink>
                </nav>
            </div>
        </header>
    )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                    ? 'bg-meso-red-500 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
        >
            {children}
        </Link>
    )
}

function CurrentTime() {
    const [time, setTime] = React.useState<string>('')

    React.useEffect(() => {
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }))
        }

        updateTime()
        const interval = setInterval(updateTime, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex items-center gap-2 text-white/60">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">{time}</span>
        </div>
    )
}
