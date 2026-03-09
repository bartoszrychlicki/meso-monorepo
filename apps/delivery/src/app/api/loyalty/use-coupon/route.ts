import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCustomerByAuthId } from '@/lib/customers'

type UseCouponRequest = {
  couponId?: string
  orderId?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    let body: UseCouponRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Nieprawidłowe dane żądania' }, { status: 400 })
    }

    const { couponId, orderId } = body

    if (!couponId || !orderId) {
      return NextResponse.json({ error: 'Brak couponId lub orderId' }, { status: 400 })
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const customer = await fetchCustomerByAuthId<{ id: string }>(admin, user.id, 'id')

    if (!customer) {
      return NextResponse.json({ error: 'Nie znaleziono klienta' }, { status: 404 })
    }

    const { data: order, error: orderError } = await admin
      .from('orders_orders')
      .select('id')
      .eq('id', orderId)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (orderError) {
      throw orderError
    }

    if (!order) {
      return NextResponse.json({ error: 'Zamówienie nie istnieje' }, { status: 404 })
    }

    const { data: coupon, error: couponError } = await admin
      .from('crm_customer_coupons')
      .select('id, status, expires_at, order_id, points_spent')
      .eq('id', couponId)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (couponError) {
      throw couponError
    }

    if (!coupon) {
      return NextResponse.json({ error: 'Kupon nie istnieje' }, { status: 404 })
    }

    if (coupon.status === 'used' && coupon.order_id === orderId) {
      await admin
        .from('orders_orders')
        .update({ loyalty_points_used: coupon.points_spent ?? 0 })
        .eq('id', orderId)
        .eq('customer_id', customer.id)

      return NextResponse.json({ success: true })
    }

    if (coupon.status !== 'active' || coupon.expires_at <= now) {
      return NextResponse.json({ error: 'Kupon nie jest już aktywny' }, { status: 409 })
    }

    const { data: updatedCoupon, error: updateError } = await admin
      .from('crm_customer_coupons')
      .update({
        status: 'used',
        used_at: now,
        order_id: orderId,
      })
      .eq('id', couponId)
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .gt('expires_at', now)
      .select('id')
      .maybeSingle()

    if (updateError) {
      throw updateError
    }

    if (!updatedCoupon) {
      return NextResponse.json({ error: 'Kupon nie jest już aktywny' }, { status: 409 })
    }

    await admin
      .from('orders_orders')
      .update({ loyalty_points_used: coupon.points_spent ?? 0 })
      .eq('id', orderId)
      .eq('customer_id', customer.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
