import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getLatestP24Refund, getLatestVerifiedP24Session, upsertP24Refund, type P24RefundRecord } from '@/lib/p24-payment-sessions'
import { P24, P24RefundError } from '@/lib/p24'
import { createAdminClient } from '@/lib/supabase/admin'
import { Tables } from '@/lib/table-mapping'

interface RefundRequestBody {
  orderId?: string
  requestedBy?: string
  requestedFrom?: 'pos' | 'kds' | 'system'
}

function getInternalApiKey(request: Request): string {
  return request.headers.get('X-Internal-API-Key')?.trim() || ''
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.DELIVERY_INTERNAL_API_KEY?.trim()
  return Boolean(expected && getInternalApiKey(request) === expected)
}

function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

function buildRefundDescription(orderNumber?: string): string {
  const base = `Zwrot ${orderNumber || 'MESO'}`
  return base.slice(0, 35)
}

function buildRefundIds() {
  return {
    requestId: crypto.randomUUID(),
    refundsUuid: `rf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
}

export async function POST(request: Request) {
  let persistedOrderId: string | null = null
  let persistedRefundRecord: P24RefundRecord | null = null
  let persistedMetadata: Record<string, unknown> | null = null

  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as RefundRequestBody
    const orderId = body.orderId?.trim()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: order, error } = await supabaseAdmin
      .from(Tables.orders)
      .select('id, order_number, total, payment_status, metadata')
      .eq('id', orderId)
      .maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Order is not paid' }, { status: 409 })
    }

    const existingRefund = getLatestP24Refund(order.metadata)
    if (existingRefund) {
      return NextResponse.json(
        { error: 'Refund already requested for this order', refund: existingRefund },
        { status: 409 }
      )
    }

    const verifiedSession = getLatestVerifiedP24Session(order.metadata)
    if (!verifiedSession?.p24OrderId) {
      return NextResponse.json(
        { error: 'Missing verified P24 transaction data for refund' },
        { status: 409 }
      )
    }

    const p24 = new P24({
      merchantId: parseInt(process.env.P24_MERCHANT_ID || '0'),
      posId: parseInt(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID || '0'),
      crcKey: process.env.P24_CRC_KEY || '',
      apiKey: process.env.P24_API_KEY || '',
      mode: (process.env.P24_MODE as 'sandbox' | 'production') || 'sandbox',
    })

    const { requestId, refundsUuid } = buildRefundIds()
    const amount = Math.round(Number(order.total) * 100)
    const description = buildRefundDescription(order.order_number)

    const refundRecord: P24RefundRecord = {
      requestId,
      refundsUuid,
      sessionId: verifiedSession.sessionId,
      p24OrderId: verifiedSession.p24OrderId,
      amount,
      description,
      status: 'requested',
      requestedAt: new Date().toISOString(),
      requestedBy: body.requestedBy,
      requestedFrom: body.requestedFrom || 'system',
    }

    persistedMetadata = upsertP24Refund(order.metadata, refundRecord)
    const { error: updateError } = await supabaseAdmin
      .from(Tables.orders)
      .update({
        metadata: persistedMetadata,
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('[P24 Refund] Failed to persist refund metadata:', updateError)
      return NextResponse.json(
        { error: 'Failed to persist refund metadata' },
        { status: 500 }
      )
    }

    persistedOrderId = order.id
    persistedRefundRecord = refundRecord

    const refundItems = await p24.refundTransaction({
      requestId,
      refundsUuid,
      urlStatus: `${getAppUrl()}/api/payments/p24/refund/status`,
      refunds: [
        {
          orderId: Number(verifiedSession.p24OrderId),
          sessionId: verifiedSession.sessionId,
          amount,
          description,
        },
      ],
    })

    const refundItem = refundItems[0]
    if (!refundItem?.status) {
      const rejectedRefundRecord: P24RefundRecord = {
        ...refundRecord,
        status: 'manual_action_required',
        rejectedAt: new Date().toISOString(),
        errorMessage: refundItem?.message || 'Refund request rejected by P24',
      }

      await supabaseAdmin
        .from(Tables.orders)
        .update({
          metadata: upsertP24Refund(persistedMetadata, rejectedRefundRecord),
        })
        .eq('id', order.id)

      return NextResponse.json(
        { error: rejectedRefundRecord.errorMessage, refund: rejectedRefundRecord },
        { status: 409 }
      )
    }

    return NextResponse.json({ status: 'requested', refund: refundRecord })
  } catch (error) {
    if (persistedOrderId && persistedRefundRecord && persistedMetadata) {
      const failedRefundRecord: P24RefundRecord = {
        ...persistedRefundRecord,
        status: 'manual_action_required',
        rejectedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Refund request failed',
      }

      await createAdminClient()
        .from(Tables.orders)
        .update({
          metadata: upsertP24Refund(persistedMetadata, failedRefundRecord),
        })
        .eq('id', persistedOrderId)
    }

    if (error instanceof P24RefundError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.statusCode || 409 }
      )
    }

    console.error('[P24 Refund] Failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
