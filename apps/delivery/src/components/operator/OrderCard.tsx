'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Clock, Loader2, PlayCircle, CheckCircle,
    Truck, Phone, MapPin, Flame, Plus, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OperatorOrder, getOrderAge } from '@/hooks/useOperatorOrders'
import { formatOrderDisplayId } from '@/lib/format-order-display-id'
import { cn } from '@/lib/utils'

interface OrderCardProps {
    order: OperatorOrder
    variant: 'new' | 'preparing' | 'ready' | 'in_delivery' | 'delivered'
    compact?: boolean
    onStartPreparing?: (id: string) => Promise<boolean>
    onMarkAsReady?: (id: string) => Promise<boolean>
    onMarkAsInDelivery?: (id: string) => Promise<boolean>
    onMarkAsDelivered?: (id: string) => Promise<boolean>
}

export function OrderCard({
    order,
    variant,
    compact = false,
    onStartPreparing,
    onMarkAsReady,
    onMarkAsInDelivery,
    onMarkAsDelivered,
}: OrderCardProps) {
    const [isUpdating, setIsUpdating] = useState(false)
    const [updatingAction, setUpdatingAction] = useState<string | null>(null)

    const age = getOrderAge(order.created_at)

    const handleAction = async (action: string) => {
        setIsUpdating(true)
        setUpdatingAction(action)

        try {
            if (action === 'start' && onStartPreparing) {
                await onStartPreparing(order.id)
            } else if (action === 'ready' && onMarkAsReady) {
                await onMarkAsReady(order.id)
            } else if (action === 'courier' && onMarkAsInDelivery) {
                await onMarkAsInDelivery(order.id)
            } else if (action === 'delivered' && onMarkAsDelivered) {
                await onMarkAsDelivered(order.id)
            }
        } catch (error) {
            console.error(error)
        }

        setIsUpdating(false)
        setUpdatingAction(null)
    }

    const btnHeight = compact ? 'h-9 text-sm' : 'h-12 text-base'

    // ─── COMPACT CARD (columns 3-5) ─────────────────────────
    if (compact) {
        return (
            <div className={cn(
                'bg-meso-dark-900/80 rounded-xl p-3 border transition-all',
                age.isUrgent && variant === 'ready' && 'border-red-500',
                !age.isUrgent && 'border-white/10',
                variant === 'delivered' && 'opacity-75'
            )}>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">#{formatOrderDisplayId(order.id, order.order_number)}</span>
                        <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            order.delivery_type === 'delivery'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                        )}>
                            {order.delivery_type === 'delivery' ? 'Dostawa' : 'Odbiór'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                        <Clock className="w-3 h-3" />
                        <span>{age.label}</span>
                    </div>
                </div>

                {/* Brief summary: item count + customer */}
                <div className="text-xs text-white/50 mb-2">
                    {order.items.length} {order.items.length === 1 ? 'pozycja' : order.items.length < 5 ? 'pozycje' : 'pozycji'}
                    {order.customer?.name && (
                        <span className="ml-1">· {order.customer.name}</span>
                    )}
                </div>

                {/* Details link */}
                <Link
                    href={`/operator/orders/${order.id}`}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors mb-2 inline-block"
                >
                    Szczegóły →
                </Link>

                {/* Action Buttons */}
                <ActionButtons
                    variant={variant}
                    isUpdating={isUpdating}
                    updatingAction={updatingAction}
                    btnHeight={btnHeight}
                    onAction={handleAction}
                />
            </div>
        )
    }

    // ─── FULL CARD (columns 1-2) ────────────────────────────
    return (
        <div className={cn(
            'bg-meso-dark-900/80 rounded-xl p-4 border transition-all',
            age.isUrgent && (variant === 'new' || variant === 'preparing') && 'border-red-500 animate-pulse',
            !age.isUrgent && 'border-white/10',
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">#{formatOrderDisplayId(order.id, order.order_number)}</span>
                    <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        order.delivery_type === 'delivery'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                    )}>
                        {order.delivery_type === 'delivery' ? 'Dostawa' : 'Odbiór'}
                    </span>
                </div>

                <div className={cn(
                    'flex items-center gap-1 text-sm',
                    age.isUrgent ? 'text-red-400' : 'text-white/50'
                )}>
                    <Clock className="w-4 h-4" />
                    <span>{age.label}</span>
                </div>
            </div>

            {/* ALL items – always visible */}
            <div className="space-y-2 mb-3">
                {order.items.map((item) => (
                    <ItemRow key={item.id} item={item} />
                ))}
            </div>

            {/* Order notes */}
            {order.notes && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3 text-sm text-yellow-300">
                    📋 {order.notes}
                </div>
            )}

            {/* Customer info (for delivery) */}
            {order.delivery_type === 'delivery' && order.delivery_address && (
                <div className="bg-white/5 rounded-lg p-2 mb-3 text-sm text-white/60">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>
                            {order.delivery_address.street} {order.delivery_address.building_number}
                            {order.delivery_address.apartment_number && `/${order.delivery_address.apartment_number}`}
                        </span>
                    </div>
                    {order.customer?.phone && (
                        <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-4 h-4 shrink-0" />
                            <span>{order.customer.phone}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Details link */}
            <Link
                href={`/operator/orders/${order.id}`}
                className="text-xs text-white/40 hover:text-white/70 transition-colors mb-3 inline-block"
            >
                Szczegóły →
            </Link>

            {/* Action Buttons – big */}
            <ActionButtons
                variant={variant}
                isUpdating={isUpdating}
                updatingAction={updatingAction}
                btnHeight={btnHeight}
                onAction={handleAction}
            />
        </div>
    )
}

// ─── Shared action buttons ──────────────────────────────────
function ActionButtons({
    variant,
    isUpdating,
    updatingAction,
    btnHeight,
    onAction,
}: {
    variant: string
    isUpdating: boolean
    updatingAction: string | null
    btnHeight: string
    onAction: (action: string) => void
}) {
    return (
        <div className="space-y-2">
            {variant === 'new' && (
                <Button
                    onClick={() => onAction('start')}
                    disabled={isUpdating}
                    className={`w-full bg-orange-500 hover:bg-orange-600 text-white font-bold ${btnHeight}`}
                >
                    {isUpdating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <PlayCircle className="w-5 h-5 mr-2" />
                            ROZPOCZNIJ
                        </>
                    )}
                </Button>
            )}

            {variant === 'preparing' && (
                <Button
                    onClick={() => onAction('ready')}
                    disabled={isUpdating}
                    className={`w-full bg-green-500 hover:bg-green-600 text-white font-bold ${btnHeight}`}
                >
                    {isUpdating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            GOTOWE
                        </>
                    )}
                </Button>
            )}

            {variant === 'ready' && (
                <>
                    <Button
                        onClick={() => onAction('courier')}
                        disabled={isUpdating}
                        className={`w-full bg-purple-500 hover:bg-purple-600 text-white font-bold ${btnHeight}`}
                    >
                        {isUpdating && updatingAction === 'courier' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Truck className="w-5 h-5 mr-2" />
                                WYDANO KURIEROWI
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={() => onAction('delivered')}
                        disabled={isUpdating}
                        className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold ${btnHeight}`}
                    >
                        {isUpdating && updatingAction === 'delivered' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <User className="w-5 h-5 mr-2" />
                                WYDANO KLIENTOWI
                            </>
                        )}
                    </Button>
                </>
            )}

            {variant === 'in_delivery' && (
                <Button
                    onClick={() => onAction('delivered')}
                    disabled={isUpdating}
                    className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold ${btnHeight}`}
                >
                    {isUpdating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            DOSTARCZONO
                        </>
                    )}
                </Button>
            )}

            {variant === 'delivered' && (
                <div className={`w-full bg-white/5 text-white/40 font-bold text-center rounded-lg flex items-center justify-center gap-2 ${btnHeight}`}>
                    <CheckCircle className="w-4 h-4" />
                    <span>ZAKOŃCZONE</span>
                </div>
            )}
        </div>
    )
}

// ─── Item row for full cards ────────────────────────────────
function ItemRow({ item }: { item: OperatorOrder['items'][0] }) {
    // Addons may come as a JSON string from JSONB column — ensure it's an array
    const addons = Array.isArray(item.addons)
        ? item.addons
        : typeof item.addons === 'string'
            ? (() => { try { return JSON.parse(item.addons) } catch { return [] } })()
            : []

    return (
        <div className="flex items-start gap-2 text-sm">
            <span className="font-bold text-meso-red-500 w-6 shrink-0 text-base">{item.quantity}x</span>
            <div className="flex-1 min-w-0">
                <span className="text-white font-medium">{item.product?.name || 'Produkt'}</span>
                {item.variant_name && (
                    <span className="text-white/50 ml-1">({item.variant_name})</span>
                )}

                {/* Spice level */}
                {item.spice_level && item.spice_level > 1 && (
                    <span className="inline-flex items-center gap-0.5 text-orange-400 ml-1">
                        <Flame className="w-3 h-3" />
                        <span className="text-xs">
                            {item.spice_level === 2 ? 'Ostre' : 'Bardzo ostre'}
                        </span>
                    </span>
                )}

                {/* Addons */}
                {addons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {addons.map((addon: { name: string }, i: number) => (
                            <span key={i} className="flex items-center gap-0.5 text-xs text-green-400">
                                <Plus className="w-2.5 h-2.5" />
                                {addon.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Notes */}
                {item.notes && (
                    <p className="text-xs text-yellow-400 mt-0.5 italic">
                        📝 {item.notes}
                    </p>
                )}
            </div>
        </div>
    )
}
