import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ValidatePromoBody {
  code: string
  subtotal: number
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

  const { code, subtotal } = body

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

  // Look up the promo code (case-insensitive)
  const { data: promo, error } = await supabase
    .from('crm_promotions')
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
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny wygas\u0142' },
      { status: 200 }
    )
  }

  // Check if promo code is not yet valid
  if (promo.valid_from && new Date(promo.valid_from) > new Date()) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny nie jest jeszcze aktywny' },
      { status: 200 }
    )
  }

  // Check minimum order value
  if (promo.min_order_value && subtotal < Number(promo.min_order_value)) {
    return NextResponse.json(
      {
        valid: false,
        error: `Minimalna warto\u015B\u0107 zam\u00F3wienia to ${Number(promo.min_order_value).toFixed(2)} PLN`,
      },
      { status: 200 }
    )
  }

  // Check max uses
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json(
      { valid: false, error: 'Kod promocyjny zosta\u0142 ju\u017C wykorzystany maksymaln\u0105 liczb\u0119 razy' },
      { status: 200 }
    )
  }

  // Check first_order_only flag - requires an authenticated user
  if (promo.first_order_only) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Musisz by\u0107 zalogowany, aby u\u017Cy\u0107 tego kodu' },
        { status: 200 }
      )
    }

    // Check if the user has any previous completed orders
    const { count } = await supabase
      .from('orders_orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .neq('status', 'cancelled')

    if (count != null && count > 0) {
      return NextResponse.json(
        { valid: false, error: 'Ten kod jest dost\u0119pny tylko przy pierwszym zam\u00F3wieniu' },
        { status: 200 }
      )
    }
  }

  // All checks passed - return valid promo code details
  return NextResponse.json({
    valid: true,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value ? Number(promo.discount_value) : null,
    free_product_id: promo.free_product_id ?? null,
    code: promo.code,
  })
}
