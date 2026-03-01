import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { P24 } from '@/lib/p24'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'P24 Register Endpoint Reachable' })
}

export async function POST(request: Request) {
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

        const supabaseAdmin = createAdminClient()
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders_orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            console.error('[P24 Register] Order lookup failed:', orderError)
            return NextResponse.json({ error: 'Nie znaleziono zamówienia w bazie danych' }, { status: 400 })
        }

        if (order.customer_id !== user.id) {
            return NextResponse.json({ error: 'Brak uprawnień do tego zamówienia' }, { status: 403 })
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
        const sessionId = `${order.id}-${Date.now()}` // Unique session ID
        const description = `Zamówienie #${order.id}`

        // Extract email from delivery_address or user auth
        // order.delivery_address is JSONB, let's cast it safely
        const deliveryAddress = order.delivery_address as Record<string, string | undefined>
        const email = deliveryAddress?.email || user.email || 'klient@meso.pl'

        // Register transaction
        const token = await p24.registerTransaction(
            sessionId,
            amount,
            description,
            email,
            `${appUrl}/order-confirmation?orderId=${order.id}`, // urlReturn
            `${appUrl}/api/payments/p24/status`, // urlStatus
        )

        // Update order with session ID if we want to track it, 
        // or just rely on P24 returning it in notification.
        // Good practice to store p24_session_id in order if we have a column, 
        // but for now we might not have it. We can add it to metadata or just proceed.

        return NextResponse.json({
            token,
            url: p24.getPaymentLink(token)
        })

    } catch (error) {
        console.error('Payment registration error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
