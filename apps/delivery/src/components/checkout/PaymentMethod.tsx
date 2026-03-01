'use client'

import { CreditCard, Smartphone, Landmark, Ban, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaymentType = 'online' | 'pay_on_pickup'

interface PaymentMethodProps {
    selected: PaymentType
    onChange: (type: PaymentType) => void
    payOnPickupFee: number
    payOnPickupMaxOrder: number
    orderSubtotal: number
}

export function PaymentMethod({
    selected,
    onChange,
    payOnPickupFee,
    payOnPickupMaxOrder,
    orderSubtotal,
}: PaymentMethodProps) {
    const exceedsLimit = orderSubtotal > payOnPickupMaxOrder

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Płatność</h3>
            </div>

            {/* Option 1: Online payment */}
            <button
                type="button"
                onClick={() => onChange('online')}
                className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all',
                    selected === 'online'
                        ? 'border-primary bg-primary/5 neon-border'
                        : 'border-border bg-card hover:border-primary/30'
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                        selected === 'online' ? 'border-primary' : 'border-muted-foreground/40'
                    )}>
                        {selected === 'online' && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium">Płatność online</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Przelewy24 — BLIK, karta, Apple Pay, Google Pay</p>
                    </div>
                </div>
                <div className="mt-2 ml-8 flex flex-wrap gap-1.5">
                    {[
                        { label: 'BLIK', icon: <span className="font-bold text-[10px]">BLIK</span> },
                        { label: 'Karta', icon: <CreditCard className="w-3 h-3" /> },
                        { label: 'Apple Pay', icon: <Smartphone className="w-3 h-3" /> },
                        { label: 'Google Pay', icon: <Smartphone className="w-3 h-3" /> },
                    ].map((m) => (
                        <span
                            key={m.label}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300"
                        >
                            {m.icon}
                            {m.label}
                        </span>
                    ))}
                </div>
            </button>

            {/* Option 2: Pay on pickup */}
            <button
                type="button"
                onClick={() => !exceedsLimit && onChange('pay_on_pickup')}
                disabled={exceedsLimit}
                className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all',
                    exceedsLimit && 'opacity-50 cursor-not-allowed',
                    selected === 'pay_on_pickup'
                        ? 'border-primary bg-primary/5 neon-border'
                        : 'border-border bg-card hover:border-primary/30'
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                        selected === 'pay_on_pickup' ? 'border-primary' : 'border-muted-foreground/40'
                    )}>
                        {selected === 'pay_on_pickup' && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-accent" />
                            <span className="text-sm font-medium">Płatność przy odbiorze</span>
                            {payOnPickupFee > 0 && (
                                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                    +{payOnPickupFee} zł
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Karta lub BLIK przy odbiorze · do {payOnPickupMaxOrder} zł
                        </p>
                    </div>
                </div>
            </button>

            {/* Limit warning */}
            {exceedsLimit && (
                <p className="flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Płatność przy odbiorze dostępna do {payOnPickupMaxOrder} zł. Twoje zamówienie: {orderSubtotal.toFixed(0)} zł.
                </p>
            )}

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Ban className="w-3.5 h-3.5 flex-shrink-0" />
                Gotówki nie przyjmujemy
            </p>
        </div>
    )
}
