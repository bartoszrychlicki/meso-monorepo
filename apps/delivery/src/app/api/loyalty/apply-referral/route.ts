import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    const { referral_phone } = await request.json()
    if (!referral_phone) {
      return NextResponse.json({ error: 'Brak numeru telefonu' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if customer already has a referrer
    const { data: currentCustomer } = await admin
      .from('crm_customers')
      .select('id, referred_by, phone')
      .eq('id', user.id)
      .single()

    if (!currentCustomer) {
      return NextResponse.json({ error: 'Klient nie znaleziony' }, { status: 404 })
    }

    if (currentCustomer.referred_by) {
      return NextResponse.json({ error: 'Już masz polecającego' }, { status: 409 })
    }

    // Normalize phone: strip all non-digits to get the local number
    const digits = referral_phone.replace(/\D/g, '')
    // Remove leading country code 48 if present (handles +48xxx, 48xxx, and plain 9-digit)
    const cleanPhone = digits.replace(/^48/, '')

    // Prevent self-referral
    if (currentCustomer.phone) {
      const ownDigits = currentCustomer.phone.replace(/\D/g, '')
      const ownClean = ownDigits.replace(/^48/, '')
      if (cleanPhone === ownClean) {
        return NextResponse.json({ error: 'Nie możesz polecić samego siebie' }, { status: 400 })
      }
    }

    // Find referrer by phone (match E.164, with-prefix, and bare local number)
    const { data: referrer } = await admin
      .from('crm_customers')
      .select('id, phone')
      .or(`phone.eq.${cleanPhone},phone.eq.+48${cleanPhone},phone.eq.48${cleanPhone}`)
      .neq('id', user.id)
      .maybeSingle()

    if (!referrer) {
      return NextResponse.json(
        { error: 'Nie znaleziono klienta z tym numerem telefonu' },
        { status: 404 }
      )
    }

    // Check referrer has at least 1 delivered order
    const { count: referrerOrders } = await admin
      .from('orders_orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', referrer.id)
      .eq('status', 'delivered')

    if (!referrerOrders || referrerOrders < 1) {
      return NextResponse.json(
        { error: 'Polecający musi mieć co najmniej jedno zrealizowane zamówienie' },
        { status: 400 }
      )
    }

    // Check monthly referral limit (max 10)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: monthlyReferrals } = await admin
      .from('crm_customers')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', referrer.id)
      .gte('created_at', startOfMonth.toISOString())

    if (monthlyReferrals && monthlyReferrals >= 10) {
      return NextResponse.json(
        { error: 'Polecający osiągnął limit poleceń w tym miesiącu' },
        { status: 429 }
      )
    }

    // Set referrer
    await admin
      .from('crm_customers')
      .update({ referred_by: referrer.id })
      .eq('id', user.id)

    // Create welcome coupon (free product: Gyoza, 7 days validity)
    const code = 'WELCOME-' + nanoid(5).toUpperCase()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await admin
      .from('crm_customer_coupons')
      .insert({
        customer_id: user.id,
        reward_id: null,
        code,
        coupon_type: 'free_product',
        free_product_name: 'Gyoza (6 szt)',
        status: 'active',
        points_spent: 0,
        source: 'referral_welcome',
        expires_at: expiresAt,
      })

    return NextResponse.json({
      success: true,
      message: 'Polecenie zastosowane! Masz kupon powitalny na darmowe Gyoza.',
      coupon_code: code,
    })

  } catch {
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
