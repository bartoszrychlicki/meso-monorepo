import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCustomerIdentityByAuthId } from '@/lib/customers'
import { P24 } from '@/lib/p24'
import {
    getActiveP24Session,
    markP24SessionStatus,
    upsertP24Session,
} from '@/lib/p24-payment-sessions'
import { Tables } from '@/lib/table-mapping'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'P24 Register Endpoint Reachable' })
}

export async function POST(request: Request) {
    let supabaseAdmin: ReturnType<typeof createAdminClient> | null = null
    let orderIdForFailure: string | null = null
    let failedSessionId: string | null = null

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            console.warn('[P24 Register] Unauthorized attempt')
            return NextResponse.json({ error: 'Nieautoryzowany dostęp' }, { status: 401 })
        }

        const body = await request.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: 'Brak ID zamówienia' }, { status: 400 })
        }

        // Get Order using Admin Client to bypass RLS
        console.log(`[P24 Register] Processing for Order ID: ${orderId}, User ID: ${user.id}`)

        supabaseAdmin = createAdminClient()
        const { data: order, error: orderError } = await supabaseAdmin
            .from(Tables.orders)
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            console.error('[P24 Register] Order lookup failed:', orderError)
            return NextResponse.json({ error: 'Nie znaleziono zamówienia w bazie danych' }, { status: 400 })
        }

        const customer = await fetchCustomerIdentityByAuthId(supabaseAdmin, user.id)
        if (!customer || order.customer_id !== customer.id) {
            return NextResponse.json({ error: 'Brak uprawnień do tego zamówienia' }, { status: 403 })
        }
        if (order.payment_status === 'paid') {
            return NextResponse.json({ error: 'To zamówienie jest już opłacone' }, { status: 409 })
        }

        const activeSession = getActiveP24Session(order.metadata)
        if (
            activeSession &&
            activeSession.status === 'pending' &&
            activeSession.url &&
            activeSession.token
        ) {
            return NextResponse.json({
                token: activeSession.token,
                url: activeSession.url,
            })
        }

        // Initialize P24
        const merchantId = parseInt(process.env.P24_MERCHANT_ID || '0')
        const posId = parseInt(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID || '0')
        const crcKey = process.env.P24_CRC_KEY || ''
        const apiKey = process.env.P24_API_KEY || ''
        const mode = (process.env.P24_MODE as 'sandbox' | 'production') || 'sandbox'

        console.log(`[P24 Config] URL: ${process.env.NEXT_PUBLIC_APP_URL}, Mode: ${mode}`)
        console.log(`[P24 Config] Merchant: ${merchantId}, POS: ${posId}`)
        console.log(`[P24 Config] API Key (exists): ${!!apiKey}, CRC (exists): ${!!crcKey}`)
        // Do NOT log full keys for security, just presence or partial

        const p24 = new P24({
            merchantId,
            posId,
            crcKey,
            apiKey,
            mode,
        })

        // Determine App URL (Production vs Local)
        // 1. NEXT_PUBLIC_APP_URL (Custom set in Vercel)
        // 2. VERCEL_PROJECT_PRODUCTION_URL (Auto-set by Vercel for prod)
        // 3. VERCEL_URL (Auto-set by Vercel for preview/prod, usually without https://)
        // 4. Localhost fallback
        let appUrl = process.env.NEXT_PUBLIC_APP_URL

        if (!appUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
            appUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        } else if (!appUrl && process.env.VERCEL_URL) {
            appUrl = `https://${process.env.VERCEL_URL}`
        } else if (!appUrl) {
            appUrl = 'http://localhost:3000'
        }

        console.log(`[P24 Register] Resolved App URL: ${appUrl}`)

        // Prepare data
        const amount = Math.round(order.total * 100) // Convert to grosze
        const now = new Date().toISOString()
        const sessionId = `${order.id}-${Date.now()}`
        const description = `Zamówienie #${order.id}`
        orderIdForFailure = order.id
        failedSessionId = sessionId

        // Extract email from delivery_address or user auth
        // order.delivery_address is JSONB, let's cast it safely
        const deliveryAddress = order.delivery_address as Record<string, string | undefined>
        const email = deliveryAddress?.email || user.email || 'klient@meso.pl'

        const pendingMetadata = upsertP24Session(
            order.metadata,
            {
                sessionId,
                status: 'registering',
                createdAt: now,
            },
            { replaceCurrentActive: true, now }
        )

        await supabaseAdmin
            .from(Tables.orders)
            .update({ metadata: pendingMetadata })
            .eq('id', order.id)

        // Register transaction
        const token = await p24.registerTransaction(
            sessionId,
            amount,
            description,
            email,
            `${appUrl}/order-confirmation?orderId=${order.id}`, // urlReturn
            `${appUrl}/api/payments/p24/status`, // urlStatus
        )

        const completedMetadata = upsertP24Session(
            pendingMetadata,
            {
                sessionId,
                token,
                url: p24.getPaymentLink(token),
                status: 'pending',
                createdAt: now,
            },
            { now }
        )

        await supabaseAdmin
            .from(Tables.orders)
            .update({ metadata: completedMetadata })
            .eq('id', order.id)

        return NextResponse.json({
            token,
            url: p24.getPaymentLink(token)
        })

    } catch (error) {
        if (supabaseAdmin && orderIdForFailure && failedSessionId) {
            try {
                const { data: failedOrder } = await supabaseAdmin
                    .from(Tables.orders)
                    .select('metadata')
                    .eq('id', orderIdForFailure)
                    .maybeSingle()

                if (failedOrder) {
                    await supabaseAdmin
                        .from(Tables.orders)
                        .update({
                            metadata: markP24SessionStatus(
                                failedOrder.metadata,
                                failedSessionId,
                                'failed'
                            ),
                        })
                        .eq('id', orderIdForFailure)
                }
            } catch (metadataError) {
                console.error('[P24 Register] Failed to persist session failure state:', metadataError)
            }
        }

        console.error('Payment registration error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
