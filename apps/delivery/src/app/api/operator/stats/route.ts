import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function validateOperatorPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-operator-pin')
  const validPin = process.env.OPERATOR_PIN || '0000'
  return pin === validPin
}

export async function GET(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to' }, { status: 400 })
  }

  const fromDate = new Date(from)
  fromDate.setHours(0, 0, 0, 0)
  const toDate = new Date(to)
  toDate.setDate(toDate.getDate() + 1)
  toDate.setHours(0, 0, 0, 0)

  const { data: orders, error } = await supabase
    .from('orders_orders')
    .select('id, status, payment_status, total, created_at, confirmed_at, ready_at')
    .gte('created_at', fromDate.toISOString())
    .lt('created_at', toDate.toISOString())
    .not('status', 'eq', 'cancelled')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: orders || [] })
}
