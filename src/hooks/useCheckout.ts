'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import type { AddressFormData, DeliveryFormData, PaymentFormData } from '@/lib/validators/checkout'

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

export function useCheckout() {
    const router = useRouter()
    const supabase = createClient()
    const { user } = useAuth()
    const { items, getTotal, getSubtotal, getDeliveryFee, getPaymentFee, getDiscount, tip, promoCode, loyaltyCoupon, clearCart } = useCartStore()

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submitOrder = async (
        deliveryData: DeliveryFormData,
        addressData: AddressFormData,
        paymentData: PaymentFormData,
        savePhoneToProfile?: boolean
    ) => {
        // Prevent double submission
        if (isLoading) return

        try {
            setIsLoading(true)
            setError(null)

            if (!user) {
                throw new Error('Musisz być zalogowany, aby złożyć zamówienie')
            }

            if (items.length === 0) {
                throw new Error('Twój koszyk jest pusty')
            }

            // 1. Get active location (MVP: just get the first one)
            const { data: locations, error: locationError } = await supabase
                .from('users_locations')
                .select('id')
                .eq('is_active', true)
                .limit(1)
                .single()

            if (locationError || !locations) {
                throw new Error('Nie znaleziono aktywnej restauracji')
            }

            const total = getTotal()
            const subtotal = getSubtotal()
            const isPayOnPickup = paymentData.method === 'pay_on_pickup'

            // Generate order number: WEB-YYYYMMDD-HHMMSS-RRR
            const d = new Date()
            const pad = (n: number) => String(n).padStart(2, '0')
            const orderNumber = `WEB-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

            // 2. Create Order
            // Build scheduled_time as a proper TIMESTAMPTZ if provided
            let scheduledTimestamp: string | null = null
            if (deliveryData.time === 'scheduled' && deliveryData.scheduledTime) {
                const today = new Date()
                const [hours, minutes] = deliveryData.scheduledTime.split(':').map(Number)
                today.setHours(hours, minutes, 0, 0)
                scheduledTimestamp = today.toISOString()
            }

            const now = new Date().toISOString()

            // Build items JSONB for orders_orders.items column
            // (POS constraint requires non-empty items array)
            const itemsJsonb = items.map(item => {
                const basePrice = item.price + (item.variantPrice || 0)
                const addonsPrice = item.addons.reduce((sum, addon) => sum + addon.price, 0)
                const unitPrice = basePrice + addonsPrice
                return {
                    product_id: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unit_price: unitPrice,
                    total_price: unitPrice * item.quantity,
                    spice_level: item.spiceLevel || null,
                    variant_name: item.variantName || null,
                    addons: item.addons,
                }
            })

            const { data: order, error: orderError } = await supabase
                .from('orders_orders')
                .insert({
                    order_number: orderNumber,
                    channel: 'web',
                    customer_id: user.id,
                    ...buildOrderCustomerFields(addressData),
                    location_id: locations.id,
                    status: isPayOnPickup ? 'confirmed' : 'pending_payment',
                    delivery_type: deliveryData.type,
                    delivery_address: addressData, // JSONB (includes phone)
                    scheduled_time: scheduledTimestamp,
                    payment_method: paymentData.method,
                    payment_status: isPayOnPickup ? 'pay_on_pickup' : 'pending',
                    ...(isPayOnPickup ? { confirmed_at: now } : {}),
                    subtotal,
                    delivery_fee: getDeliveryFee() + getPaymentFee(),
                    tip,
                    promo_code: promoCode || loyaltyCoupon?.code || null,
                    promo_discount: getDiscount(),
                    total,
                    loyalty_points_earned: Math.floor(Math.max(0, subtotal - getDiscount())), // 1 pkt = 1 PLN (food value only, excludes delivery fee & tip)
                    items: itemsJsonb,
                    notes: addressData.notes
                })
                .select()
                .single()

            if (orderError) {
                console.error('Order creation error:', orderError)
                throw new Error('Błąd podczas tworzenia zamówienia')
            }

            // 2b. Save customer profile fields from checkout (name always, phone optionally)
            const profileUpdate = buildCheckoutProfileUpdate(addressData, savePhoneToProfile)

            if (Object.keys(profileUpdate).length > 0) {
                await supabase
                    .from('crm_customers')
                    .update(profileUpdate)
                    .eq('id', user.id)
            }

            // 2c. Mark loyalty coupon as used
            if (loyaltyCoupon) {
                await supabase
                    .from('crm_customer_coupons')
                    .update({
                        status: 'used',
                        used_at: new Date().toISOString(),
                        order_id: order.id,
                    })
                    .eq('id', loyaltyCoupon.id)
                    .eq('customer_id', user.id)
            }

            // 3. Create Order Items
            const orderItems = items.map(item => {
                const basePrice = item.price + (item.variantPrice || 0)
                const addonsPrice = item.addons.reduce((sum, addon) => sum + addon.price, 0)
                const unitPrice = basePrice + addonsPrice
                const totalPrice = unitPrice * item.quantity

                return {
                    order_id: order.id,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_price: unitPrice, // Storing final unit price including modifiers
                    spice_level: item.spiceLevel,
                    variant_name: item.variantName,
                    addons: item.addons, // JSONB
                    total_price: totalPrice,
                }
            })

            const { error: itemsError } = await supabase
                .from('orders_order_items')
                .insert(orderItems)

            if (itemsError) {
                console.error('Order items error:', itemsError)
                // Optionally revert order creation here, but for MVP we skip
                throw new Error('Błąd podczas dodawania produktów do zamówienia')
            }

            // 4. Payment flow
            if (isPayOnPickup) {
                // Pay on pickup — skip P24, go directly to confirmation
                clearCart()
                router.push(`/order-confirmation?orderId=${order.id}`)
            } else {
                // Online payment — register with P24
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
            // If we failed after setting isLoading to true, we must unset it to allow retry
            // BUT for the "duplicate order" issue, validation/logic errors should allow retry.
            // Network errors/404 should allow retry? Yes.
            setIsLoading(false)
        }
        // Note: We removed 'finally { setIsLoading(false) }' because if we redirect,
        // we want the button to stay loading until unmount.
        // But if we catch an error, we MUST set it back to false (done in catch).
    }

    return {
        submitOrder,
        isLoading,
        error,
    }
}
