'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { createOrderAction } from '@/app/actions/create-order'
import { fetchCustomerByAuthId } from '@/lib/customers'
import { Tables } from '@/lib/table-mapping'
import type { AddressFormData, DeliveryFormData, PaymentFormData } from '@/lib/validators/checkout'
import { OrderChannel, OrderSource, ModifierAction, PaymentMethod, PaymentStatus } from '@meso/core'

type CheckoutProfileUpdate = {
    first_name?: string
    last_name?: string
    phone?: string | null
}

export function buildCheckoutProfileUpdate(
    addressData: Pick<AddressFormData, 'firstName' | 'lastName' | 'phone'>,
    savePhoneToProfile?: boolean
): CheckoutProfileUpdate {
    const profileUpdate: CheckoutProfileUpdate = {}

    if (addressData.firstName) {
        profileUpdate.first_name = addressData.firstName.trim()
    }

    if (addressData.lastName) {
        profileUpdate.last_name = addressData.lastName.trim()
    }

    if (savePhoneToProfile && addressData.phone) {
        profileUpdate.phone = addressData.phone
    }

    return profileUpdate
}

export function buildOrderCustomerFields(
    addressData: Pick<AddressFormData, 'firstName' | 'lastName' | 'phone'>
): { customer_name: string | null; customer_phone: string | null } {
    const name = [addressData.firstName?.trim(), addressData.lastName?.trim()]
        .filter(Boolean)
        .join(' ') || null
    return {
        customer_name: name,
        customer_phone: addressData.phone || null,
    }
}

export async function markLoyaltyCouponAsUsed(couponId: string, orderId: string) {
    const response = await fetch('/api/loyalty/use-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId, orderId }),
    })

    let payload: { error?: string } | null = null
    try {
        payload = await response.json()
    } catch {
        payload = null
    }

    if (response.ok) {
        return
    }

    const message =
        payload?.error || 'Nie udało się oznaczyć kuponu lojalnościowego jako użytego'

    console.error('[useCheckout] Failed to mark loyalty coupon as used', {
        couponId,
        orderId,
        status: response.status,
        message,
    })

    throw new Error(message)
}

export function useCheckout() {
    const router = useRouter()
    const supabase = createClient()
    const { user } = useAuth()
    const { items, getDeliveryFee, getPaymentFee, getDiscount, tip, promoCode, loyaltyCoupon, clearCart } = useCartStore()

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submitOrder = async (
        deliveryData: DeliveryFormData,
        addressData: AddressFormData,
        paymentData: PaymentFormData,
        savePhoneToProfile?: boolean
    ) => {
        if (isLoading) return

        try {
            setIsLoading(true)
            setError(null)

            if (!user) throw new Error('Musisz być zalogowany, aby złożyć zamówienie')
            if (items.length === 0) throw new Error('Twój koszyk jest pusty')

            const customer = await fetchCustomerByAuthId<{ id: string }>(supabase, user.id, 'id')
            if (!customer) {
                throw new Error('Nie znaleziono profilu klienta')
            }

            const isPayOnPickup = paymentData.method === 'pay_on_pickup'
            const externalOrderId = crypto.randomUUID()

            // Get active location (read from Supabase — allowed)
            const { data: locations, error: locationError } = await supabase
                .from(Tables.locations)
                .select('id')
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .order('id', { ascending: true })
                .limit(1)
                .single()

            if (locationError || !locations) {
                throw new Error('Nie znaleziono aktywnej restauracji')
            }

            // Build scheduled_time
            let scheduledTimestamp: string | undefined
            if (deliveryData.time === 'scheduled' && deliveryData.scheduledTime) {
                const today = new Date()
                const [hours, minutes] = deliveryData.scheduledTime.split(':').map(Number)
                today.setHours(hours, minutes, 0, 0)
                scheduledTimestamp = today.toISOString()
            }

            const customerFields = buildOrderCustomerFields(addressData)

            // 1. Create order via POS API (server action)
            const orderResult = await createOrderAction({
                channel: OrderChannel.DELIVERY_APP,
                source: OrderSource.DELIVERY,
                location_id: locations.id,
                customer_id: customer.id,
                customer_name: customerFields.customer_name || undefined,
                customer_phone: customerFields.customer_phone || undefined,
                delivery_address: {
                    firstName: addressData.firstName,
                    lastName: addressData.lastName,
                    email: addressData.email,
                    phone: addressData.phone,
                    street: addressData.street || undefined,
                    houseNumber: addressData.houseNumber || undefined,
                    city: addressData.city || undefined,
                    postal_code: addressData.postalCode || undefined,
                    country: 'PL',
                },
                items: items.map(item => ({
                    product_id: item.productId,
                    product_name: item.name,
                    quantity: item.quantity,
                    unit_price: item.price + (item.variantPrice || 0),
                    variant_id: item.variantId,
                    variant_name: item.variantName,
                    modifiers: item.addons.map(addon => ({
                        modifier_id: addon.id,
                        name: addon.name,
                        price: addon.price,
                        quantity: 1,
                        modifier_action: ModifierAction.ADD,
                    })),
                })),
                payment_method: isPayOnPickup ? PaymentMethod.PAY_ON_PICKUP : PaymentMethod.ONLINE,
                payment_status: isPayOnPickup ? PaymentStatus.PAY_ON_PICKUP : PaymentStatus.PENDING,
                discount: getDiscount(),
                delivery_fee: getDeliveryFee() + getPaymentFee(),
                tip,
                loyalty_points_used: loyaltyCoupon?.points_spent ?? 0,
                promo_code: promoCode || loyaltyCoupon?.code || undefined,
                delivery_type: deliveryData.type as 'delivery' | 'pickup',
                scheduled_time: scheduledTimestamp,
                external_order_id: externalOrderId,
                notes: addressData.notes,
            })

            if (!orderResult.success) {
                throw new Error(orderResult.error)
            }

            const order = orderResult.data

            // 2. Save customer profile (still direct Supabase — delivery's own customer data)
            const profileUpdate = buildCheckoutProfileUpdate(addressData, savePhoneToProfile)
            if (Object.keys(profileUpdate).length > 0) {
                await supabase
                    .from(Tables.customers)
                    .update(profileUpdate)
                    .eq('auth_id', user.id)
            }

            // 3. Mark loyalty coupon as used via server endpoint
            if (loyaltyCoupon) {
                await markLoyaltyCouponAsUsed(loyaltyCoupon.id, order.id)
            }

            // 4. Payment flow (unchanged)
            if (isPayOnPickup) {
                clearCart()
                router.push(`/order-confirmation?orderId=${order.id}`)
            } else {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 30_000)
                const response = await fetch('/api/payments/p24/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: order.id }),
                    signal: controller.signal,
                })
                clearTimeout(timeoutId)

                let data
                const contentType = response.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json()
                } else {
                    if (response.status === 404) {
                        throw new Error('Usługa płatności jest niedostępna (404). Spróbuj ponownie później.')
                    }
                    throw new Error(`Błąd serwera płatności: ${response.status}`)
                }

                if (!response.ok) {
                    throw new Error(data.error || 'Błąd podczas rejestracji płatności')
                }

                if (data.url) {
                    clearCart()
                    window.location.href = data.url
                } else {
                    throw new Error('Nie otrzymano linku do płatności')
                }
            }

        } catch (err) {
            const isAbort = err instanceof DOMException && err.name === 'AbortError'
            const message = isAbort
                ? 'Serwer płatności nie odpowiada. Spróbuj ponownie za chwilę.'
                : err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd'
            setError(message)
            toast.error(message)
            setIsLoading(false)
        }
    }

    return {
        submitOrder,
        isLoading,
        error,
    }
}
