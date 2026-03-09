import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'
import { fetchCustomerByAuthId } from '@/lib/customers'
import { Tables } from '@/lib/table-mapping'

function normalizeReferralInput(input: string): string {
  return input.trim()
}

function normalizeReferralCode(input: string): string {
  return normalizeReferralInput(input).toUpperCase()
}

function normalizeReferralPhone(input: string): string {
  const digits = normalizeReferralInput(input).replace(/\D/g, '')
  return digits.replace(/^48/, '')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Nieprawidłowe dane żądania' }, { status: 400 })
    }

    const referralValue =
      typeof body.referral_input === 'string'
        ? body.referral_input
        : typeof body.referral_phone === 'string'
          ? body.referral_phone
          : ''

    const referralInput = normalizeReferralInput(referralValue)
    if (!referralInput) {
      return NextResponse.json({ error: 'Brak kodu lub numeru polecającego' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if customer already has a referrer
    const currentCustomer = await fetchCustomerByAuthId<{
      id: string
      referred_by: string | null
      phone: string | null
      referral_code: string | null
    }>(
      admin,
      user.id,
      'id, referred_by, phone, referral_code'
    )

    if (!currentCustomer) {
      return NextResponse.json({ error: 'Klient nie znaleziony' }, { status: 404 })
    }

    const normalizedCode = normalizeReferralCode(referralInput)
    const normalizedPhone = normalizeReferralPhone(referralInput)

    let appliedVia: 'code' | 'phone' = 'phone'
    let referrer: { id: string; phone: string | null } | null = null

    if (
      currentCustomer.referral_code &&
      normalizedCode === normalizeReferralCode(currentCustomer.referral_code)
    ) {
      return NextResponse.json({ error: 'Nie możesz polecić samego siebie' }, { status: 400 })
    }

    const { data: referrerByCode } = await admin
      .from(Tables.customers)
      .select('id, phone')
      .eq('referral_code', normalizedCode)
      .neq('id', currentCustomer.id)
      .maybeSingle()

    if (referrerByCode) {
      referrer = referrerByCode
      appliedVia = 'code'
    } else {
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: 'Nie znaleziono klienta z tym kodem lub numerem telefonu' },
          { status: 404 }
        )
      }

      if (currentCustomer.phone) {
        const ownPhone = normalizeReferralPhone(currentCustomer.phone)
        if (normalizedPhone && ownPhone === normalizedPhone) {
          return NextResponse.json({ error: 'Nie możesz polecić samego siebie' }, { status: 400 })
        }
      }

      const { data: referrerByPhone } = await admin
        .from(Tables.customers)
        .select('id, phone')
        .or(`phone.eq.${normalizedPhone},phone.eq.+48${normalizedPhone},phone.eq.48${normalizedPhone}`)
        .neq('id', currentCustomer.id)
        .maybeSingle()

      referrer = referrerByPhone
      appliedVia = 'phone'
    }

    if (!referrer) {
      return NextResponse.json(
        { error: 'Nie znaleziono klienta z tym kodem lub numerem telefonu' },
        { status: 404 }
      )
    }

    if (currentCustomer.referred_by && currentCustomer.referred_by !== referrer.id) {
      return NextResponse.json({ error: 'Już masz polecającego' }, { status: 409 })
    }

    const isExistingReferral = currentCustomer.referred_by === referrer.id

    if (isExistingReferral) {
      const { data: existingWelcomeCoupon } = await admin
        .from(Tables.customerCoupons)
        .select('code')
        .eq('customer_id', currentCustomer.id)
        .eq('source', 'referral_welcome')
        .order('created_at', { ascending: false })
        .maybeSingle()

      if (existingWelcomeCoupon?.code) {
        return NextResponse.json({
          success: true,
          applied_via: appliedVia,
          message: 'Polecenie było już wcześniej zapisane.',
          coupon_code: existingWelcomeCoupon.code,
        })
      }
    }

    if (!isExistingReferral) {
      // Check referrer has at least 1 delivered order
      const { count: referrerOrders } = await admin
        .from(Tables.orders)
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
        .from(Tables.customers)
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', referrer.id)
        .gte('created_at', startOfMonth.toISOString())

      if (monthlyReferrals && monthlyReferrals >= 10) {
        return NextResponse.json(
          { error: 'Polecający osiągnął limit poleceń w tym miesiącu' },
          { status: 429 }
        )
      }
    }

    // Set referrer
    if (!isExistingReferral) {
      await admin
        .from(Tables.customers)
        .update({ referred_by: referrer.id })
        .eq('id', currentCustomer.id)
    }

    // Create welcome coupon (free product: Gyoza, 7 days validity)
    const code = 'WELCOME-' + nanoid(5).toUpperCase()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await admin
      .from(Tables.customerCoupons)
      .insert({
        customer_id: currentCustomer.id,
        promotion_id: null,
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
      applied_via: appliedVia,
      message: 'Polecenie zastosowane! Masz kupon powitalny na darmowe Gyoza.',
      coupon_code: code,
    })

  } catch {
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
