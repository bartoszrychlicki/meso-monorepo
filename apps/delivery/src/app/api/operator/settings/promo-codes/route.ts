import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Validate operator PIN from request header
function validateOperatorPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-operator-pin')
  // In production, store hashed PIN in env or DB
  const validPin = process.env.OPERATOR_PIN || '0000'
  return pin === validPin
}

// GET /api/operator/settings/promo-codes - fetch all promo codes
export async function GET(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('crm_promotions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ promoCodes: data })
}

// POST /api/operator/settings/promo-codes - create a new promo code
export async function POST(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const { code, discount_type } = body

    if (!code || !discount_type) {
      return NextResponse.json(
        { error: 'Missing required fields: code, discount_type' },
        { status: 400 }
      )
    }

    const validDiscountTypes = ['percent', 'fixed', 'free_item', 'free_delivery']
    if (!validDiscountTypes.includes(discount_type)) {
      return NextResponse.json(
        { error: `Invalid discount_type. Must be one of: ${validDiscountTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const allowedFields = [
      'code',
      'discount_type',
      'discount_value',
      'free_product_id',
      'min_order_value',
      'max_uses',
      'first_order_only',
      'valid_from',
      'valid_until',
      'is_active',
    ]

    const insertData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        insertData[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from('crm_promotions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ promoCode: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH /api/operator/settings/promo-codes - update a promo code by id
export async function PATCH(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const allowedFields = [
      'code',
      'discount_type',
      'discount_value',
      'free_product_id',
      'min_order_value',
      'max_uses',
      'first_order_only',
      'valid_from',
      'valid_until',
      'is_active',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    if (updateData.discount_type) {
      const validDiscountTypes = ['percent', 'fixed', 'free_item', 'free_delivery']
      if (!validDiscountTypes.includes(updateData.discount_type as string)) {
        return NextResponse.json(
          { error: `Invalid discount_type. Must be one of: ${validDiscountTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('crm_promotions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ promoCode: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/operator/settings/promo-codes - soft-delete a promo code
export async function DELETE(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('crm_promotions')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
