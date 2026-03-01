'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Clock, CreditCard, Store, Radio } from 'lucide-react'
import { useOrderDetails } from '@/hooks/useOrderDetails'
import { OrderTimeline, OrderStatusBadge, OrderItemsList } from '@/components/orders'
import { ORDER_STATUS_MESSAGES, formatOrderDate } from '@/types/order'
import { formatPrice } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { isOrderActive } from '@/lib/order-confirmation-utils'
import { formatOrderDisplayId } from '@/lib/format-order-display-id'

export default function OrderDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.id as string
    const { order, loading, error } = useOrderDetails(orderId)

    const paymentMethodLabels: Record<string, string> = {
        blik: 'BLIK',
        card: 'Karta płatnicza',
        cash: 'Gotówka przy odbiorze',
        pay_on_pickup: 'Przy odbiorze',
        apple_pay: 'Apple Pay',
        google_pay: 'Google Pay',
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-6">
                <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Zamówienia
                </Link>
                <div className="text-center py-16">
                    <p className="text-red-500 text-lg mb-4">{error || 'Nie znaleziono zamówienia'}</p>
                    <Button
                        onClick={() => router.push('/orders')}
                        className="bg-primary hover:bg-primary/90 text-white"
                    >
                        Wróć do listy zamówień
                    </Button>
                </div>
            </div>
        )
    }

    const statusMessage = ORDER_STATUS_MESSAGES[order.status]

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-6">
            {/* Back button */}
            <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Zamówienia
            </Link>

            {/* Title */}
            <div>
                <h1 className="font-display text-xl font-bold tracking-wider">
                    ZAMÓWIENIE #{formatOrderDisplayId(order.id, order.order_number)}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{formatOrderDate(order.created_at)}</p>
            </div>

            {/* Status section */}
            <section className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="text-4xl mb-3">{statusMessage.emoji}</div>
                <h2 className="text-xl font-bold text-foreground mb-1">{statusMessage.title}</h2>
                <p className="text-muted-foreground text-sm">{statusMessage.subtitle}</p>
                <div className="mt-4">
                    <OrderStatusBadge status={order.status} size="lg" />
                </div>
                {isOrderActive(order.status) && (
                    <Link
                        href={`/order-confirmation?orderId=${order.id}`}
                        className="mt-4 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Radio className="w-4 h-4" />
                        Śledź na żywo
                    </Link>
                )}
            </section>

            {/* Timeline */}
            <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Status zamówienia</h3>
                <OrderTimeline status={order.status} />
            </section>

            {/* Delivery info */}
            <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {order.delivery_type === 'delivery' ? 'Dostawa' : 'Odbiór osobisty'}
                </h3>

                <div className="space-y-3">
                    {order.delivery_type === 'delivery' && order.delivery_address && (
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-foreground font-medium">
                                    {order.delivery_address.street} {order.delivery_address.building_number}
                                    {order.delivery_address.apartment_number && `/${order.delivery_address.apartment_number}`}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {order.delivery_address.postal_code} {order.delivery_address.city}
                                </p>
                            </div>
                        </div>
                    )}

                    {order.delivery_type === 'pickup' && order.location && (
                        <div className="flex items-start gap-3">
                            <Store className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-foreground font-medium">{order.location.name}</p>
                                <p className="text-muted-foreground text-sm">{order.location.address}</p>
                            </div>
                        </div>
                    )}

                    {order.scheduled_time && (
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <p className="text-foreground">
                                Zaplanowano na: {formatOrderDate(order.scheduled_time)}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Order items */}
            <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Twoje zamówienie</h3>
                <OrderItemsList items={order.items} />
            </section>

            {/* Payment summary */}
            <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Podsumowanie</h3>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Produkty</span>
                        <span className="text-foreground">{formatPrice(order.subtotal)}</span>
                    </div>

                    {order.delivery_fee > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dostawa</span>
                            <span className="text-foreground">{formatPrice(order.delivery_fee)}</span>
                        </div>
                    )}

                    {order.promo_discount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rabat {order.promo_code && `(${order.promo_code})`}</span>
                            <span className="text-green-400">-{formatPrice(order.promo_discount)}</span>
                        </div>
                    )}

                    {order.tip > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Napiwek</span>
                            <span className="text-foreground">{formatPrice(order.tip)}</span>
                        </div>
                    )}

                    <div className="border-t border-border pt-2 mt-2">
                        <div className="flex justify-between">
                            <span className="font-bold text-foreground">Razem</span>
                            <span className="font-bold text-xl text-primary">{formatPrice(order.total)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {paymentMethodLabels[order.payment_method] || order.payment_method}
                    </span>
                </div>
            </section>

            {/* Restaurant contact */}
            {order.location?.phone && (
                <section className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Kontakt z restauracją</h3>
                    <a
                        href={`tel:${order.location.phone}`}
                        className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors"
                    >
                        <Phone className="w-5 h-5" />
                        <span className="font-medium">{order.location.phone}</span>
                    </a>
                </section>
            )}
        </div>
    )
}
