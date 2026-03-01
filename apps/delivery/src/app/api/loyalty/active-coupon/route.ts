import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ coupon: null })
    }

    const admin = createAdminClient()

    // Expire stale coupons first (lazy cleanup)
    await admin
      .from('crm_customer_coupons')
      .update({ status: 'expired' })
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    // Mark used coupons (lazy cleanup for checkout RLS failures)
    // If a coupon code appears on a paid order, it was used even if status wasn't updated
    const { data: activeCoupons } = await admin
      .from('crm_customer_coupons')
      .select('id, code')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    if (activeCoupons && activeCoupons.length > 0) {
      for (const c of activeCoupons) {
        const { data: usedOrder } = await admin
          .from('orders_orders')
          .select('id')
          .eq('customer_id', user.id)
          .eq('promo_code', c.code)
          .in('payment_status', ['paid', 'pay_on_pickup'])
          .limit(1)
          .maybeSingle()

        if (usedOrder) {
          await admin
            .from('crm_customer_coupons')
            .update({ status: 'used', used_at: new Date().toISOString(), order_id: usedOrder.id })
            .eq('id', c.id)
        }
      }
    }

    // Fetch active coupon (after cleanup)
    const { data: coupon } = await admin
      .from('crm_customer_coupons')
      .select('id, code, coupon_type, discount_value, free_product_name, expires_at, source')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    return NextResponse.json({ coupon: coupon || null })

  } catch {
    return NextResponse.json({ coupon: null })
  }
}
