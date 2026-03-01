import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transformCustomer } from './transform-customer'

// Validate operator PIN from request header
function validateOperatorPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-operator-pin')
  // In production, store hashed PIN in env or DB
  const validPin = process.env.OPERATOR_PIN || '0000'
  return pin === validPin
}

// GET /api/operator/orders - fetch all active orders
export async function GET(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const orderId = searchParams.get('orderId')

  // Single order fetch
  if (orderId) {
    const { data, error } = await supabase
      .from('orders_orders')
      .select(`
        *,
        items:orders_order_items(
          *,
          product:menu_products(id, name, image_url, images)
        ),
        customer:crm_customers(first_name, last_name, phone, email)
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const order = data ? {
      ...data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: data.items?.map((item: any) => ({
        ...item,
        product: item.product,
        variant_name: item.variant_name || null,
      })) || [],
      customer: transformCustomer(data.customer),
    } : null

    return NextResponse.json({ order })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let query = supabase
    .from('orders_orders')
    .select(`
      *,
      items:orders_order_items(
        *,
        product:menu_products(id, name, image_url, images)
      ),
      customer:crm_customers(first_name, last_name, phone)
    `)
    .or(`status.in.(confirmed,preparing,ready,awaiting_courier,in_delivery),and(status.eq.delivered,created_at.gte.${today.toISOString()})`)
    .order('created_at', { ascending: true })

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform variant data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (data || []).map((order: any) => ({
    ...order,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: order.items?.map((item: any) => ({
      ...item,
      product: item.product,
      variant_name: item.variant_name || null,
    })) || [],
    customer: transformCustomer(order.customer),
  }))

  return NextResponse.json({ orders })
}

// PATCH /api/operator/orders - update order status
export async function PATCH(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { orderId, status, timestampField } = body

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 })
    }

    const validStatuses = ['confirmed', 'preparing', 'ready', 'awaiting_courier', 'in_delivery', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString()
    }

    const { error } = await supabase
      .from('orders_orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
