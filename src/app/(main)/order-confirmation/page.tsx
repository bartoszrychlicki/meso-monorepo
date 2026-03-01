'use client'

import { useEffect, useState, useRef, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, ChefHat, Package, MapPin, Navigation, Loader2, XCircle, CreditCard, AlertTriangle, Banknote, Star } from 'lucide-react'
import { useOrderConfirmationStore } from '@/stores/orderConfirmationStore'
import { formatPriceExact } from '@/lib/formatters'
import { getProductImageUrl } from '@/lib/product-image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { OrderConfirmation } from '@/stores/orderConfirmationStore'
import { PAYMENT_TIMEOUT_MS, getPickupStepIndex, isPaymentPending } from '@/lib/order-confirmation-utils'

// Step definitions for pickup orders
const pickupSteps = [
    { key: 'accepted', label: 'Przyjęte', icon: CheckCircle2 },
    { key: 'paid', label: 'Opłacone', icon: CheckCircle2 },
    { key: 'preparing', label: 'W przygotowaniu', icon: ChefHat },
    { key: 'ready', label: 'Gotowe do odbioru', icon: Package },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildConfirmation(order: Record<string, any>, waitMinutes = 20): OrderConfirmation {
    const deliveryAddress = order.delivery_address as Record<string, string | undefined>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const location = order.location as Record<string, any>

    // POS stores location address as JSONB; extract city/street
    const locAddr = location && typeof location.address === 'object' && location.address
        ? (location.address as Record<string, string>)
        : null

    return {
        orderId: order.id.toString(),
        orderNumber: order.order_number || order.id.toString().slice(-8).toUpperCase(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: order.items.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            name: item.product?.name || item.custom_name || 'Produkt',
            price: item.unit_price,
            variantPrice: 0,
            image: getProductImageUrl(item.product),
            quantity: item.quantity,
            spiceLevel: item.spice_level,
            variantId: item.variant_id,
            variantName: item.variant_name,
            addons: item.addons || [],
            notes: item.notes
        })),
        deliveryType: order.delivery_type,
        deliveryAddress: order.delivery_type === 'delivery' ? {
            street: deliveryAddress?.street,
            houseNumber: deliveryAddress?.houseNumber,
            apartmentNumber: deliveryAddress?.apartmentNumber,
            city: deliveryAddress?.city,
            firstName: deliveryAddress?.firstName,
            lastName: deliveryAddress?.lastName,
        } : null,
        pickupLocation: location ? {
            name: location.name || 'MESO',
            address: locAddr?.street || String(location.address || ''),
            city: locAddr?.city || '',
        } : null,
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        discount: order.promo_discount || 0,
        tip: order.tip || 0,
        total: order.total,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.status,
        estimatedTime: `~${waitMinutes} min`,
        createdAt: order.created_at,
        loyaltyPointsEarned: order.loyalty_points_earned || 0,
    }
}

function OrderConfirmationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { confirmation, setConfirmation, clearConfirmation } = useOrderConfirmationStore()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')

    // Initial fetch
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                if (!confirmation) router.replace('/')
                return
            }

            try {
                if (!confirmation) setIsLoading(true)

                const supabase = createClient()

                const [orderRes, configRes] = await Promise.all([
                    supabase
                        .from('orders_orders')
                        .select(`
                            *,
                            location:users_locations(name, address, phone),
                            items:orders_order_items(
                                *,
                                product:menu_products(*)
                            )
                        `)
                        .eq('id', orderId)
                        .single(),
                    supabase
                        .from('app_config')
                        .select('key, value')
                        .eq('key', 'estimated_wait_time')
                        .maybeSingle(),
                ])

                if (orderRes.error || !orderRes.data) {
                    throw new Error('Nie znaleziono zamówienia')
                }

                const waitMinutes = configRes.data ? parseInt(configRes.data.value as string) || 20 : 20
                setConfirmation(buildConfirmation(orderRes.data, waitMinutes))
            } catch (err) {
                console.error('Error fetching order:', err)
                setError('Nie udało się pobrać szczegółów zamówienia')
                toast.error('Nie udało się pobrać szczegółów zamówienia')
            } finally {
                setIsLoading(false)
            }
        }

        fetchOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, router, setConfirmation])

    // Supabase Realtime — listen for order updates (status, payment_status)
    // Plus safety-net polling every 10s until order reaches a terminal state
    useEffect(() => {
        if (!orderId) return

        const terminalStatuses = ['delivered', 'cancelled']
        const supabase = createClient()

        const channel = supabase
            .channel(`order-confirmation-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders_orders',
                    filter: `id=eq.${orderId}`,
                },
                (payload) => {
                    const updated = payload.new as Record<string, string | undefined>
                    console.log('[Realtime] Order updated:', updated.status, updated.payment_status)

                    setConfirmation((prev) => {
                        if (!prev) return prev
                        return {
                            ...prev,
                            orderStatus: updated.status ?? prev.orderStatus,
                            paymentStatus: updated.payment_status ?? prev.paymentStatus,
                        }
                    })

                    // Toast on status changes
                    if (updated.payment_status === 'paid') {
                        toast.success('Płatność potwierdzona!')
                    }
                    if (updated.status === 'preparing') {
                        toast.info('Przygotowujemy Twój posiłek!')
                    }
                    if (updated.status === 'ready') {
                        toast.success('Zamówienie gotowe do odbioru!')
                    }
                    if (updated.payment_status === 'failed') {
                        toast.error('Płatność nie powiodła się')
                    }
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Channel status:', status)
            })

        // Safety-net polling: re-fetch order every 10s until terminal status
        const pollId = setInterval(async () => {
            const { data } = await supabase
                .from('orders_orders')
                .select('status, payment_status')
                .eq('id', orderId)
                .single()
            if (data) {
                setConfirmation((prev) => {
                    if (!prev) return prev
                    if (prev.orderStatus === data.status && prev.paymentStatus === data.payment_status) {
                        return prev // no change
                    }
                    return {
                        ...prev,
                        orderStatus: data.status,
                        paymentStatus: data.payment_status,
                    }
                })
                if (terminalStatuses.includes(data.status)) {
                    clearInterval(pollId)
                }
            }
        }, 10_000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollId)
        }
    }, [orderId, setConfirmation])

    const [paymentTimedOut, setPaymentTimedOut] = useState(false)
    const [isRetryingPayment, setIsRetryingPayment] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Payment timeout — if payment stays pending for 3 minutes, show warning
    useEffect(() => {
        if (!confirmation) return

        if (isPaymentPending(confirmation.paymentStatus)) {
            timeoutRef.current = setTimeout(() => {
                setPaymentTimedOut(true)
            }, PAYMENT_TIMEOUT_MS)
        } else {
            setPaymentTimedOut(false)
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [confirmation?.paymentStatus, confirmation])

    const currentStep = useMemo(() => {
        if (!confirmation) return 0
        return getPickupStepIndex(confirmation.orderStatus, confirmation.paymentStatus)
    }, [confirmation])

    const isPendingPayment = confirmation && isPaymentPending(confirmation.paymentStatus)

    const handleRetryPayment = async () => {
        if (!confirmation?.orderId || isRetryingPayment) return
        setIsRetryingPayment(true)
        try {
            const response = await fetch('/api/payments/p24/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: confirmation.orderId }),
            })
            const data = await response.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                toast.error(data.error || 'Nie udało się wygenerować linku do płatności')
                setIsRetryingPayment(false)
            }
        } catch {
            toast.error('Błąd połączenia. Spróbuj ponownie.')
            setIsRetryingPayment(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="ml-3 text-white/60">Ładowanie zamówienia...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
                <XCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Wystąpił błąd</h1>
                <p className="text-white/60 mb-6">{error}</p>
                <Link
                    href="/"
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium"
                >
                    Wróć do menu
                </Link>
            </div>
        )
    }

    if (!confirmation) {
        return null
    }

    const { paymentStatus } = confirmation
    const isFailed = paymentStatus === 'failed' || paymentStatus === 'cancelled' || status === 'error'

    if (isFailed) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
                <XCircle className="w-16 h-16 text-red-500 mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">Płatność nie powiodła się</h1>
                <p className="text-white/60 mb-8 max-w-md">
                    Twoja płatność została anulowana lub wystąpił błąd.
                    Spróbuj ponownie złożyć zamówienie.
                </p>
                <div className="flex gap-4">
                    <Link
                        href="/"
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        Wróć do menu
                    </Link>
                    <Link
                        href="/checkout"
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        Spróbuj ponownie
                    </Link>
                </div>
            </div>
        )
    }

    const handleBackToMenu = () => {
        clearConfirmation()
        router.push('/')
    }

    const getMapsUrl = (address: string, city: string) => {
        const query = encodeURIComponent(`${address}, ${city}`)
        return `https://www.google.com/maps/dir/?api=1&destination=${query}`
    }

    const getAppleMapsUrl = (address: string, city: string) => {
        const query = encodeURIComponent(`${address}, ${city}`)
        return `https://maps.apple.com/?daddr=${query}`
    }

    const steps = pickupSteps
    const loyaltyPointsAlreadyCredited = confirmation.orderStatus === 'delivered'

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 pb-32">
            {/* Title */}
            <h1 className="mb-2 font-display text-xl font-bold tracking-wider text-center">
                {isPendingPayment ? 'OCZEKIWANIE NA PŁATNOŚĆ' : 'ZAMÓWIENIE ZŁOŻONE'}
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
                Zamówienie #{confirmation.orderNumber}
            </p>

            {/* Progress bar */}
            <div className="relative mb-10 mx-2">
                {/* Background track */}
                <div className="absolute top-5 left-0 right-0 h-1 rounded-full bg-secondary" />
                {/* Active track — no progress when payment is pending */}
                <motion.div
                    className="absolute top-5 left-0 h-1 rounded-full bg-primary neon-glow-sm"
                    animate={{ width: isPendingPayment ? '0%' : `${(currentStep / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
                {/* Step indicators */}
                <div className="relative flex justify-between">
                    {steps.map((step, i) => {
                        const isActive = isPendingPayment ? false : i <= currentStep
                        return (
                            <div key={step.key} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                                <motion.div
                                    animate={{
                                        scale: !isPendingPayment && i === currentStep ? 1.2 : 1,
                                    }}
                                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                                        isActive
                                            ? 'border-primary bg-primary'
                                            : 'border-border bg-card'
                                    }`}
                                >
                                    <step.icon className={`h-4 w-4 ${
                                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                                    }`} />
                                </motion.div>
                                <span className={`mt-2 text-[10px] font-medium text-center leading-tight ${
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Pending payment indicator */}
            {isPendingPayment && !paymentTimedOut && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative">
                            <CreditCard className="h-5 w-5 text-yellow-500" />
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500 animate-ping" />
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500" />
                        </div>
                        <p className="text-sm font-semibold text-yellow-500">Oczekujemy na potwierdzenie platnosci...</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8 mb-3">
                        Trwa to zazwyczaj do 30 sekund. Nie zamykaj tej strony.
                    </p>
                    <button
                        onClick={handleRetryPayment}
                        disabled={isRetryingPayment}
                        className="ml-8 flex items-center gap-2 rounded-lg bg-yellow-500/20 px-4 py-2 text-xs font-medium text-yellow-500 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                    >
                        {isRetryingPayment ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                        )}
                        Zapłać ponownie
                    </button>
                </motion.div>
            )}

            {/* Payment timeout warning */}
            {isPendingPayment && paymentTimedOut && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/5 p-5"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                        <p className="text-sm font-semibold text-orange-500">Platnosc trwa dluzej niz zwykle</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8 mb-3">
                        Jesli Twoja platnosc zostala pobrana, zamowienie zostanie potwierdzone automatycznie.
                        Jesli nie, sprobuj ponownie lub skontaktuj sie z nami.
                    </p>
                    <div className="flex gap-2 ml-8">
                        <button
                            onClick={handleRetryPayment}
                            disabled={isRetryingPayment}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-500/20 px-4 py-2 text-xs font-medium text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                        >
                            {isRetryingPayment ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <CreditCard className="h-3.5 w-3.5" />
                            )}
                            Zapłać ponownie
                        </button>
                        <a
                            href="mailto:zamowienia@mesofood.pl"
                            className="flex items-center text-xs text-orange-400 hover:text-orange-300 underline transition-colors"
                        >
                            Napisz do nas
                        </a>
                    </div>
                </motion.div>
            )}

            {/* Pay on pickup reminder */}
            {confirmation.paymentMethod === 'pay_on_pickup' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-5"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="h-5 w-5 text-blue-400 shrink-0" />
                        <p className="text-sm font-semibold text-blue-400">Płatność przy odbiorze</p>
                    </div>
                    <div className="ml-8 space-y-2">
                        <p className="text-sm text-foreground">
                            Do zapłaty: <span className="font-bold text-accent text-base">{formatPriceExact(confirmation.total)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Akceptujemy wyłącznie <span className="font-medium text-foreground">kartę płatniczą</span> lub <span className="font-medium text-foreground">BLIK</span>.
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-red-400">
                            <Banknote className="h-3.5 w-3.5 shrink-0" />
                            <span>Nie przyjmujemy płatności gotówką</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ETA */}
            <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                    {isPendingPayment ? 'Szacowany czas po oplaceniu' : 'Szacowany czas przygotowania'}
                </p>
                <p className="font-display text-3xl font-bold text-primary neon-text">
                    {confirmation.estimatedTime}
                </p>
            </div>

            {/* Pickup location with map links */}
            {confirmation.pickupLocation && (
                <div className="mb-6 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-display text-xs font-semibold uppercase tracking-wider">Punkt odbioru</h3>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-0.5">{confirmation.pickupLocation.name}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                        {confirmation.pickupLocation.address}, {confirmation.pickupLocation.city}
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">Wskazówki dojazdu</span>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href={getMapsUrl(confirmation.pickupLocation.address, confirmation.pickupLocation.city)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-all"
                        >
                            Google Maps
                        </a>
                        <a
                            href={getAppleMapsUrl(confirmation.pickupLocation.address, confirmation.pickupLocation.city)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-all"
                        >
                            Apple Maps
                        </a>
                    </div>
                </div>
            )}

            {/* Order Items */}
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider mb-3">Twoje zamówienie</h3>
                <div className="space-y-3">
                    {confirmation.items.map((item, idx) => {
                        const itemTotal = (item.price + (item.variantPrice || 0) + (item.addons?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity
                        return (
                            <div key={item.id || idx} className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="text-foreground text-sm">
                                        <span className="text-muted-foreground">{item.quantity}x</span>{' '}
                                        {item.name}
                                    </p>
                                    {item.variantName && (
                                        <p className="text-muted-foreground text-xs">{item.variantName}</p>
                                    )}
                                    {item.spiceLevel && (
                                        <p className="text-muted-foreground text-xs">
                                            {'🔥'.repeat(item.spiceLevel)}
                                        </p>
                                    )}
                                    {item.addons && item.addons.length > 0 && (
                                        <p className="text-muted-foreground text-xs">
                                            + {item.addons.map(a => a.name).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <span className="text-muted-foreground text-sm ml-2">
                                    {formatPriceExact(itemTotal)}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Price Summary */}
            <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Produkty</span>
                    <span className="text-foreground">{formatPriceExact(confirmation.subtotal)}</span>
                </div>
                {confirmation.discount > 0 && (
                    <div className="flex justify-between">
                        <span className="text-green-400">Rabat</span>
                        <span className="text-green-400">-{formatPriceExact(confirmation.discount)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Dostawa</span>
                    <span className="text-foreground">
                        {confirmation.deliveryFee > 0 ? formatPriceExact(confirmation.deliveryFee) : 'Gratis'}
                    </span>
                </div>
                {confirmation.tip > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Napiwek</span>
                        <span className="text-foreground">{formatPriceExact(confirmation.tip)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-border">
                    <span className="text-foreground">Razem</span>
                    <span className="text-accent text-lg">{formatPriceExact(confirmation.total)}</span>
                </div>
            </div>

            {/* Loyalty points earned */}
            {confirmation.loyaltyPointsEarned != null && confirmation.loyaltyPointsEarned > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-xl border border-meso-gold-400/30 bg-meso-gold-400/5 p-4"
                >
                    <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-meso-gold-400" />
                        <p className="text-sm font-semibold text-meso-gold-400">
                            {loyaltyPointsAlreadyCredited
                                ? `Przyznano +${confirmation.loyaltyPointsEarned} punktów MESO Club`
                                : `Otrzymasz +${confirmation.loyaltyPointsEarned} punktów MESO Club`}
                        </p>
                    </div>
                    {!loyaltyPointsAlreadyCredited && (
                        <p className="mt-2 text-xs text-meso-gold-400/80">
                            Punkty naliczają się po realizacji zamówienia.
                        </p>
                    )}
                </motion.div>
            )}

            {/* Back to Menu */}
            <Link
                href="/"
                onClick={(e) => { e.preventDefault(); handleBackToMenu() }}
                className="block text-center text-sm text-primary hover:underline"
            >
                Zamów więcej
            </Link>
        </div>
    )
}

export default function OrderConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <OrderConfirmationContent />
        </Suspense>
    )
}
