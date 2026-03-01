'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Clock, Loader2, PlayCircle, CheckCircle,
    Truck, Phone, MapPin, Flame, Plus, Package, ChefHat,
    AlertCircle, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OperatorOrder, getOrderAge, useOperatorOrders } from '@/hooks/useOperatorOrders'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'
import { ORDER_STATUS_MESSAGES, formatOrderDate } from '@/types/order'
import { formatPriceExact } from '@/lib/formatters'
import { formatOrderDisplayId } from '@/lib/format-order-display-id'
import { cn } from '@/lib/utils'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function OrderDetailPage({ params }: PageProps) {
    const { id } = use(params)
    const [order, setOrder] = useState<OperatorOrder | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const { pin } = useOperatorAuthStore()
    const { startPreparing, markAsReady, awaitingCourier } = useOperatorOrders()

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/operator/orders?orderId=${id}`, {
                headers: { 'x-operator-pin': pin },
            })
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            if (data.order) {
                setOrder(data.order)
            }
        } catch (err) {
            console.error('Error fetching order:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchOrder()
    }, [id])

    const handleStatusChange = async (action: 'start' | 'ready' | 'courier') => {
        if (!order) return

        setIsUpdating(true)
        let success = false

        if (action === 'start') {
            success = await startPreparing(order.id)
        } else if (action === 'ready') {
            success = await markAsReady(order.id)
        } else if (action === 'courier') {
            success = await awaitingCourier(order.id)
        }

        if (success) {
            await fetchOrder()
        }

        setIsUpdating(false)
    }

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-meso-red-500" />
            </div>
        )
    }

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-6">
                <Link href="/operator/orders" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6">
                    <ArrowLeft className="w-5 h-5" />
                    Powrót do zamówień
                </Link>
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-white">Zamówienie nie znalezione</p>
                </div>
            </div>
        )
    }

    const age = getOrderAge(order.created_at)
    const statusInfo = ORDER_STATUS_MESSAGES[order.status]

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/operator/orders" className="text-white/60 hover:text-white">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">Zamówienie #{formatOrderDisplayId(order.id, order.order_number)}</h1>
                    <p className="text-white/50">{formatOrderDate(order.created_at)}</p>
                </div>
                <div className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    order.status === 'confirmed' && 'bg-orange-500/20 text-orange-400',
                    order.status === 'preparing' && 'bg-blue-500/20 text-blue-400',
                    order.status === 'ready' && 'bg-green-500/20 text-green-400',
                    order.status === 'awaiting_courier' && 'bg-purple-500/20 text-purple-400',
                )}>
                    {order.status === 'confirmed' && <AlertCircle className="w-5 h-5" />}
                    {order.status === 'preparing' && <ChefHat className="w-5 h-5" />}
                    {order.status === 'ready' && <Package className="w-5 h-5" />}
                    {order.status === 'awaiting_courier' && <Truck className="w-5 h-5" />}
                    <span className="font-semibold">{statusInfo.title}</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Products */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-meso-red-500" />
                            Produkty
                        </h2>

                        <div className="space-y-4">
                            {order.items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        'p-4 rounded-lg bg-white/5',
                                        index % 2 === 0 && 'bg-white/[0.02]'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-meso-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-2xl font-bold text-meso-red-500">{item.quantity}</span>
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-white">
                                                {item.product?.name || 'Produkt'}
                                            </h3>

                                            {item.variant_name && (
                                                <span className="text-sm text-white/60">
                                                    Wariant: {item.variant_name}
                                                </span>
                                            )}

                                            {item.spice_level && item.spice_level > 1 && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Flame className={cn(
                                                        'w-5 h-5',
                                                        item.spice_level === 2 && 'text-orange-500',
                                                        item.spice_level === 3 && 'text-red-500'
                                                    )} />
                                                    <span className={cn(
                                                        'text-sm font-medium',
                                                        item.spice_level === 2 && 'text-orange-400',
                                                        item.spice_level === 3 && 'text-red-400'
                                                    )}>
                                                        {item.spice_level === 2 ? 'Ostre' : 'Bardzo ostre!'}
                                                    </span>
                                                </div>
                                            )}

                                            {item.addons && item.addons.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {item.addons.map((addon, i) => (
                                                        <span
                                                            key={i}
                                                            className="flex items-center gap-1 text-sm bg-green-500/20 text-green-400 px-2 py-1 rounded"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            {addon.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {item.notes && (
                                                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-sm text-yellow-300">
                                                    📝 {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {order.notes && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300">
                            <h3 className="font-semibold mb-2">Uwagi do zamówienia:</h3>
                            <p>{order.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className={cn(
                        'rounded-xl p-6 text-center',
                        age.isUrgent ? 'bg-red-500/20 border-2 border-red-500' : 'bg-meso-dark-800/50 border border-white/5'
                    )}>
                        <Clock className={cn(
                            'w-8 h-8 mx-auto mb-2',
                            age.isUrgent ? 'text-red-500' : 'text-white/50'
                        )} />
                        <p className={cn(
                            'text-3xl font-bold',
                            age.isUrgent ? 'text-red-400' : 'text-white'
                        )}>
                            {age.minutes} min
                        </p>
                        <p className="text-white/50 text-sm">od złożenia zamówienia</p>
                    </div>

                    <div className="bg-meso-dark-800/50 rounded-xl p-4 border border-white/5">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <User className="w-5 h-5 text-meso-red-500" />
                            Klient
                        </h3>

                        {order.customer?.name && (
                            <p className="text-white">{order.customer.name}</p>
                        )}

                        {order.customer?.phone && (
                            <a
                                href={`tel:${order.customer.phone}`}
                                className="flex items-center gap-2 text-white/60 hover:text-white mt-2"
                            >
                                <Phone className="w-4 h-4" />
                                {order.customer.phone}
                            </a>
                        )}
                    </div>

                    <div className="bg-meso-dark-800/50 rounded-xl p-4 border border-white/5">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            {order.delivery_type === 'delivery' ? (
                                <Truck className="w-5 h-5 text-meso-red-500" />
                            ) : (
                                <Package className="w-5 h-5 text-meso-red-500" />
                            )}
                            {order.delivery_type === 'delivery' ? 'Dostawa' : 'Odbiór osobisty'}
                        </h3>

                        {order.delivery_type === 'delivery' && order.delivery_address && (
                            <div className="text-white/60">
                                <p>
                                    {order.delivery_address.street} {order.delivery_address.building_number}
                                    {order.delivery_address.apartment_number && `/${order.delivery_address.apartment_number}`}
                                </p>
                                <p>{order.delivery_address.postal_code} {order.delivery_address.city}</p>
                                {order.delivery_address.notes && (
                                    <p className="mt-2 text-yellow-400 text-sm">
                                        📝 {order.delivery_address.notes}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Order value */}
                    <div className="bg-meso-dark-800/50 rounded-xl p-4 border border-white/5">
                        <h3 className="font-semibold text-white mb-3">Wartość zamówienia</h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-white/60">
                                <span>Produkty</span>
                                <span>{formatPriceExact(order.subtotal)}</span>
                            </div>
                            {order.delivery_fee > 0 && (
                                <div className="flex justify-between text-white/60">
                                    <span>Dostawa</span>
                                    <span>{formatPriceExact(order.delivery_fee)}</span>
                                </div>
                            )}
                            {order.tip > 0 && (
                                <div className="flex justify-between text-white/60">
                                    <span>Napiwek</span>
                                    <span>{formatPriceExact(order.tip)}</span>
                                </div>
                            )}
                            {order.promo_discount > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>Rabat</span>
                                    <span>-{formatPriceExact(order.promo_discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-white pt-1.5 border-t border-white/10">
                                <span>Razem</span>
                                <span className="text-lg">{formatPriceExact(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {order.status === 'confirmed' && (
                            <Button
                                onClick={() => handleStatusChange('start')}
                                disabled={isUpdating}
                                className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg"
                            >
                                {isUpdating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <PlayCircle className="w-5 h-5 mr-2" />
                                        ROZPOCZNIJ PRZYGOTOWANIE
                                    </>
                                )}
                            </Button>
                        )}

                        {order.status === 'preparing' && (
                            <Button
                                onClick={() => handleStatusChange('ready')}
                                disabled={isUpdating}
                                className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-bold text-lg"
                            >
                                {isUpdating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        OZNACZ JAKO GOTOWE
                                    </>
                                )}
                            </Button>
                        )}

                        {order.status === 'ready' && order.delivery_type === 'delivery' && (
                            <Button
                                onClick={() => handleStatusChange('courier')}
                                disabled={isUpdating}
                                className="w-full h-14 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg"
                            >
                                {isUpdating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Truck className="w-5 h-5 mr-2" />
                                        PRZEKAŻ KURIEROWI
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
