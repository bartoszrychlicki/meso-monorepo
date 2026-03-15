import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { markP24RefundStatus } from '@/lib/p24-payment-sessions'
import { P24, type P24RefundNotification } from '@/lib/p24'
import { getPosApi } from '@/lib/pos-api'
import { Tables } from '@/lib/table-mapping'
import type { OrderStatus, PaymentStatus } from '@meso/core'

export async function POST(request: Request) {
  try {
    const body = await request.json() as P24RefundNotification
    const p24 = new P24({
      merchantId: parseInt(process.env.P24_MERCHANT_ID || '0'),
      posId: parseInt(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID || '0'),
      crcKey: process.env.P24_CRC_KEY || '',
      apiKey: process.env.P24_API_KEY || '',
      mode: (process.env.P24_MODE as 'sandbox' | 'production') || 'sandbox',
    })

    if (!p24.verifyRefundNotificationSign(body)) {
      console.error('[P24 Refund Status] Invalid signature.', body)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const localOrderId = body.sessionId.replace(/-\d+$/, '')
    if (!localOrderId) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: existingOrder, error: orderLookupError } = await supabaseAdmin
      .from(Tables.orders)
      .select('id, status, payment_status, metadata')
      .eq('id', localOrderId)
      .maybeSingle()

    if (orderLookupError || !existingOrder) {
      console.error('[P24 Refund Status] Could not load order:', orderLookupError)
      return NextResponse.json({ error: 'Order update failed' }, { status: 500 })
    }

    const refundStatus = body.status === 0 ? 'completed' : 'rejected'
    await supabaseAdmin
      .from(Tables.orders)
      .update({
        metadata: markP24RefundStatus(
          existingOrder.metadata,
          body.refundsUuid,
          refundStatus,
          new Date().toISOString(),
          {
            errorMessage: refundStatus === 'rejected' ? 'P24 rejected refund request' : undefined,
            rawStatus: body.status,
          }
        ),
      })
      .eq('id', localOrderId)

    if (body.status === 0 && existingOrder.payment_status !== 'refunded') {
      const updateResult = await getPosApi().orders.updateStatus(localOrderId, {
        status: existingOrder.status as OrderStatus,
        payment_status: 'refunded' as PaymentStatus,
        note: `P24 refund completed. Refund UUID: ${body.refundsUuid}`,
      })

      if (!updateResult.success) {
        console.error('[P24 Refund Status] Failed to update POS payment status:', updateResult.error)
        return NextResponse.json({ error: 'Order update failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('[P24 Refund Status] Failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
