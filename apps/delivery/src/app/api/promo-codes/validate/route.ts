import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Tables } from '@/lib/table-mapping'
import { fetchCustomerByAuthId } from '@/lib/customers'

interface ValidatePromoBody {
  code: string
  subtotal: number
  channel?: 'delivery' | 'pickup'
}

const TIER_ORDER = ['bronze', 'silver', 'gold'] as const
const TIER_LABELS: Record<(typeof TIER_ORDER)[number], string> = {
  bronze: 'Brązowy',
  silver: 'Srebrny',
  gold: 'Złoty',
}

export async function POST(request: NextRequest) {
  let body: ValidatePromoBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Nieprawid\u0142owe dane wej\u015Bciowe' },
      { status: 400 }
    )
  }

  const { code, subtotal, channel } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny jest wymagany' },
      { status: 400 }
    )
  }

  if (subtotal == null || typeof subtotal !== 'number' || subtotal < 0) {
    return NextResponse.json(
      { valid: false, error: 'Nieprawid\u0142owa warto\u015B\u0107 zam\u00F3wienia' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const now = new Date()

  // Look up the promo code (case-insensitive)
  const { data: promo, error } = await supabase
    .from(Tables.promotions)
    .select('*')
    .ilike('code', code.trim())
    .single()

  if (error || !promo) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny nie istnieje' },
      { status: 200 }
    )
  }

  // Check if promo code is active
  if (!promo.is_active) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny jest nieaktywny' },
      { status: 200 }
    )
  }

  // Check if promo code has expired
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny wygas\u0142' },
      { status: 200 }
    )
  }

  // Check if promo code is not yet valid
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny nie jest jeszcze aktywny' },
      { status: 200 }
    )
  }

  // Check minimum order value
  const minOrderAmount = promo.min_order_amount ? Number(promo.min_order_amount) : null
  if (minOrderAmount != null && subtotal < minOrderAmount) {
    return NextResponse.json(
      {
        valid: false,
        error: `Minimalna warto\u015B\u0107 zam\u00F3wienia to ${minOrderAmount.toFixed(2)} PLN`,
      },
      { status: 200 }
    )
  }

  if (
    channel &&
    Array.isArray(promo.channels) &&
    promo.channels.length > 0 &&
    !promo.channels.includes(channel)
  ) {
    return NextResponse.json(
      { valid: false, error: `Ten kod promocyjny nie działa dla kanału ${channel === 'delivery' ? 'dostawa' : 'odbiór'}` },
      { status: 200 }
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const customer = user
    ? await fetchCustomerByAuthId<{ id: string; loyalty_tier: string | null }>(
        supabase,
        user.id,
        'id, loyalty_tier'
      )
    : null

  if (promo.required_loyalty_tier) {
    if (!user || !customer) {
      return NextResponse.json(
        { valid: false, error: 'Musisz by\u0107 zalogowany, aby u\u017Cy\u0107 tego kodu promocyjnego' },
        { status: 200 }
      )
    }

    const customerTierIdx = TIER_ORDER.indexOf((customer.loyalty_tier ?? 'bronze') as typeof TIER_ORDER[number])
    const requiredTierIdx = TIER_ORDER.indexOf(promo.required_loyalty_tier as typeof TIER_ORDER[number])
    if (customerTierIdx < requiredTierIdx) {
      return NextResponse.json(
        {
          valid: false,
          error: `Ten kod promocyjny wymaga poziomu ${TIER_LABELS[promo.required_loyalty_tier as (typeof TIER_ORDER)[number]] ?? promo.required_loyalty_tier}`,
        },
        { status: 200 }
      )
    }
  }

  // Check max uses across all customers based on created orders
  if (promo.max_uses != null) {
    const { count } = await supabase
      .from(Tables.orders)
      .select('id', { count: 'exact', head: true })
      .eq('promo_code', promo.code)
      .neq('status', 'cancelled')

    if (count != null && count >= promo.max_uses) {
      return NextResponse.json(
        { valid: false, error: 'Kod promocyjny zosta\u0142 ju\u017C wykorzystany maksymaln\u0105 liczb\u0119 razy' },
        { status: 200 }
      )
    }
  }

  // Check first_order_only flag
  if (promo.first_order_only) {
    if (!user || !customer) {
      return NextResponse.json(
        { valid: false, error: 'Musisz by\u0107 zalogowany, aby u\u017Cy\u0107 tego kodu promocyjnego' },
        { status: 200 }
      )
    }

    const { count: totalOrdersCount } = await supabase
      .from(Tables.orders)
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .neq('status', 'cancelled')

    if (totalOrdersCount != null && totalOrdersCount > 0) {
      return NextResponse.json(
        { valid: false, error: 'Ten kod jest dost\u0119pny tylko przy pierwszym zam\u00F3wieniu' },
        { status: 200 }
      )
    }
  }

  if (promo.max_uses_per_customer != null && user && customer) {
    const { count } = await supabase
      .from(Tables.orders)
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .eq('promo_code', promo.code)
      .neq('status', 'cancelled')

    if (count != null && count >= promo.max_uses_per_customer) {
      return NextResponse.json(
        { valid: false, error: 'Osiągnięto limit użyć tego kodu dla jednego klienta' },
        { status: 200 }
      )
    }
  }

  // All checks passed - return valid promo code details
  return NextResponse.json({
    valid: true,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value ? Number(promo.discount_value) : null,
    free_product_id: promo.free_item_id ?? null,
    code: promo.code,
  })
}
