import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js' // Direct client for Service Role
import { P24, P24Notification } from '@/lib/p24'
import { sendOrderConfirmationEmail, type OrderEmailData } from '@/lib/email'

interface DeliveryAddressJson {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    street?: string
    houseNumber?: string
    apartmentNumber?: string
    postalCode?: string
    city?: string
    notes?: string
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as P24Notification
        const { merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, sign } = body

        console.log('[P24 Status] Received notification:', JSON.stringify(body, null, 2))

        const p24 = new P24({
            merchantId: parseInt(process.env.P24_MERCHANT_ID || '0'),
            posId: parseInt(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID || '0'),
            crcKey: process.env.P24_CRC_KEY || '',
            apiKey: process.env.P24_API_KEY || '',
            mode: (process.env.P24_MODE as 'sandbox' | 'production') || 'sandbox',
        })

        // Verify transaction
        const isValid = await p24.verifyTransaction(body)

        if (!isValid) {
            console.error('[P24 Status] Invalid signature or verification failed. Body:', body)
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        console.log('[P24 Status] Signature verified successfully.')

        // Parse order ID from sessionId.
        // P24 'orderId' in notification is P24's transaction ID, NOT our database ID.
        // Our database ID is embedded in 'sessionId' as `${uuid}-${timestamp}`.
        // UUIDs contain hyphens, so we strip only the last segment (the timestamp).
        const paramOrderId = sessionId.replace(/-\d+$/, '')

        console.log(`[P24 Status] Extracted Order ID: ${paramOrderId} from Session ID: ${sessionId}`)

        if (!paramOrderId) {
            console.error('[P24 Status] Could not extract order ID from session ID:', sessionId)
            return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 })
        }

        // Initialize Admin Client to bypass RLS for status updates
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )


        // Update order status with Admin/Service Role client
        const { error: updateError, data: updatedOrder } = await supabaseAdmin
            .from('orders_orders')
            .update({
                status: 'confirmed',
                payment_status: 'paid',
                paid_at: new Date().toISOString(),
                confirmed_at: new Date().toISOString(),
                // Optionally store P24 transaction ID
                // p24_transaction_id: orderId
            })
            .eq('id', paramOrderId)
            .select() // Select to verify update
            .single()

        if (updateError) {
            console.error('[P24 Status] Failed to update order status:', updateError)
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        console.log('[P24 Status] Order updated successfully:', updatedOrder)

        // Query full order data for confirmation email
        const { data: fullOrder } = await supabaseAdmin
            .from('orders_orders')
            .select(`
                *,
                order_items:orders_order_items (
                    id, quantity, unit_price, total_price, spice_level, addons,
                    product:menu_products (name),
                    variant:menu_products (name)
                ),
                location:users_locations (name, address, city)
            `)
            .eq('id', paramOrderId)
            .single()

        if (fullOrder) {
            const addr = (fullOrder.delivery_address ?? {}) as DeliveryAddressJson

            // Build tracking URL
            const appUrl = process.env.NEXT_PUBLIC_APP_URL
                || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
                || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
                || 'http://localhost:3000'

            const emailData: OrderEmailData = {
                orderId: fullOrder.id,
                customerFirstName: addr.firstName ?? 'Kliencie',
                customerLastName: addr.lastName ?? '',
                customerEmail: addr.email ?? '',
                deliveryType: fullOrder.delivery_type,
                deliveryStreet: addr.street,
                deliveryHouseNumber: addr.houseNumber,
                deliveryCity: addr.city,
                deliveryPostalCode: addr.postalCode,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (fullOrder.order_items ?? []).map((item: any) => ({
                    productName: item.product?.name ?? 'Produkt',
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    totalPrice: item.total_price,
                    variantName: item.variant?.name ?? null,
                    spiceLevel: item.spice_level ?? null,
                    addons: Array.isArray(item.addons) ? item.addons : [],
                })),
                subtotal: fullOrder.subtotal,
                deliveryFee: fullOrder.delivery_fee,
                promoDiscount: fullOrder.promo_discount ?? 0,
                tip: fullOrder.tip ?? 0,
                total: fullOrder.total,
                paymentMethod: fullOrder.payment_method,
                locationName: fullOrder.location?.name ?? '',
                locationAddress: fullOrder.location?.address ?? '',
                locationCity: fullOrder.location?.city ?? '',
                trackingUrl: `${appUrl}/order-confirmation?orderId=${fullOrder.id}`,
            }

            // Fire-and-forget: email does not block webhook response
            void sendOrderConfirmationEmail(emailData)
                .then(r => r.success
                    ? console.log('[P24 Status] Email sent:', addr.email)
                    : console.error('[P24 Status] Email failed:', r.error))
                .catch(err => console.error('[P24 Status] Email threw:', err))
        }

        return NextResponse.json({ status: 'OK' })

    } catch (error) {
        console.error('P24 status error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
