import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'

function generateCouponCode(): string {
  return 'MESO-' + nanoid(5).toUpperCase()
}

const TIER_ORDER = ['bronze', 'silver', 'gold']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    const { reward_id } = await request.json()
    if (!reward_id) {
      return NextResponse.json({ error: 'Brak reward_id' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check for existing active coupon (expire stale ones first)
    await admin
      .from('crm_customer_coupons')
      .update({ status: 'expired' })
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    const { data: activeCoupon } = await admin
      .from('crm_customer_coupons')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (activeCoupon) {
      return NextResponse.json(
        { error: 'Masz już aktywny kupon. Użyj go lub poczekaj aż wygaśnie.' },
        { status: 409 }
      )
    }

    // Fetch reward
    const { data: reward, error: rewardError } = await admin
      .from('crm_loyalty_rewards')
      .select('*')
      .eq('id', reward_id)
      .eq('is_active', true)
      .single()

    if (rewardError || !reward) {
      return NextResponse.json({ error: 'Nagroda nie istnieje' }, { status: 404 })
    }

    // Fetch customer
    const { data: customer, error: customerError } = await admin
      .from('crm_customers')
      .select('loyalty_points, loyalty_tier')
      .eq('id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Nie znaleziono klienta' }, { status: 404 })
    }

    // Check points
    if (customer.loyalty_points < reward.points_cost) {
      return NextResponse.json(
        { error: `Potrzebujesz ${reward.points_cost} pkt, masz ${customer.loyalty_points}` },
        { status: 400 }
      )
    }

    // Check tier
    const customerTierIdx = TIER_ORDER.indexOf(customer.loyalty_tier || 'bronze')
    const requiredTierIdx = TIER_ORDER.indexOf(reward.min_tier || 'bronze')

    if (customerTierIdx < requiredTierIdx) {
      return NextResponse.json(
        { error: `Ta nagroda wymaga poziomu ${reward.min_tier}` },
        { status: 403 }
      )
    }

    // Generate unique coupon code
    let code = generateCouponCode()
    for (let i = 0; i < 5; i++) {
      const { data } = await admin
        .from('crm_customer_coupons')
        .select('id')
        .eq('code', code)
        .maybeSingle()
      if (!data) break
      code = generateCouponCode()
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // For free_product rewards, compute discount_value as cheapest product price in matching category
    let computedDiscountValue = reward.discount_value
    if (reward.reward_type === 'free_product' && !reward.discount_value) {
      const rewardNameLower = (reward.name as string).toLowerCase()
      const { data: categories } = await admin.from('menu_categories').select('id, slug')

      let categoryId: string | null = null
      if (categories) {
        for (const cat of categories) {
          if (rewardNameLower.includes(cat.slug)) {
            categoryId = cat.id
            break
          }
        }
      }

      if (categoryId) {
        const { data: cheapest } = await admin
          .from('menu_products')
          .select('price')
          .eq('category_id', categoryId)
          .order('price', { ascending: true })
          .limit(1)
          .single()

        if (cheapest) {
          computedDiscountValue = cheapest.price
        }
      }
    }

    // Deduct points
    const { error: pointsError } = await admin
      .from('crm_customers')
      .update({ loyalty_points: customer.loyalty_points - reward.points_cost })
      .eq('id', user.id)

    if (pointsError) {
      return NextResponse.json({ error: 'Błąd przy odejmowaniu punktów' }, { status: 500 })
    }

    // Create coupon (promotion_id FK references crm_promotions, not rewards — leave null for reward-based coupons)
    const { data: coupon, error: couponError } = await admin
      .from('crm_customer_coupons')
      .insert({
        customer_id: user.id,
        code,
        coupon_type: reward.reward_type,
        discount_value: computedDiscountValue,
        free_product_name: reward.reward_type === 'free_product' ? reward.name : null,
        status: 'active',
        points_spent: reward.points_cost,
        source: 'reward',
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (couponError) {
      // Rollback points
      await admin
        .from('crm_customers')
        .update({ loyalty_points: customer.loyalty_points })
        .eq('id', user.id)
      return NextResponse.json({ error: 'Błąd przy tworzeniu kuponu' }, { status: 500 })
    }

    // Log to crm_loyalty_transactions (formerly loyalty_history)
    await admin
      .from('crm_loyalty_transactions')
      .insert({
        customer_id: user.id,
        description: `Kupon: ${reward.name}`,
        amount: -reward.points_cost,
        reason: 'spent',
      })

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        coupon_type: coupon.coupon_type,
        discount_value: coupon.discount_value,
        free_product_name: coupon.free_product_name,
        expires_at: coupon.expires_at,
      }
    })

  } catch {
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
