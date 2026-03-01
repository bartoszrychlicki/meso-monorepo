'use client'

import { Store, Truck, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeliveryFormProps {
    value: {
        type: 'delivery' | 'pickup'
        time: 'asap' | 'scheduled'
    }
    onChange: (value: { type: 'delivery' | 'pickup'; time: 'asap' | 'scheduled' }) => void
}

export function DeliveryForm({ value, onChange }: DeliveryFormProps) {

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Forma odbioru</h3>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange({ ...value, type: 'pickup' })}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all',
                        value.type === 'pickup'
                            ? 'bg-primary text-primary-foreground neon-glow-sm'
                            : 'bg-secondary text-foreground hover:bg-secondary/80'
                    )}
                >
                    <Store className="h-4 w-4" />
                    Odbiór
                </button>
                <button
                    type="button"
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                >
                    <Truck className="h-4 w-4" />
                    Dostawa
                </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
                Dostawę realizują nasi partnerzy — Glovo, Pyszne.pl i Wolt. Szukaj nas w swojej ulubionej aplikacji!
            </p>
        </div>
    )
}
