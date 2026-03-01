import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Find active coupon
    const { data: coupon } = await admin
      .from('crm_customer_coupons')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!coupon) {
      return NextResponse.json({ error: 'Brak aktywnego kuponu' }, { status: 404 })
    }

    // Mark as cancelled (points are NOT refunded)
    await admin
      .from('crm_customer_coupons')
      .update({ status: 'cancelled', used_at: new Date().toISOString() })
      .eq('id', coupon.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
