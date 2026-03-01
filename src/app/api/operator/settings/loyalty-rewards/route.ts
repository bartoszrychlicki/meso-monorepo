import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Validate operator PIN from request header
function validateOperatorPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-operator-pin')
  // In production, store hashed PIN in env or DB
  const validPin = process.env.OPERATOR_PIN || '0000'
  return pin === validPin
}

// GET /api/operator/settings/loyalty-rewards - fetch all loyalty rewards
export async function GET(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('crm_loyalty_rewards')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rewards: data })
}

// POST /api/operator/settings/loyalty-rewards - create a new loyalty reward
export async function POST(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const { name, description, points_cost, reward_type, discount_value, icon, sort_order, min_tier } = body

    if (!name || points_cost === undefined || !reward_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, points_cost, reward_type' },
        { status: 400 }
      )
    }

    const validRewardTypes = ['free_delivery', 'discount', 'free_product']
    if (!validRewardTypes.includes(reward_type)) {
      return NextResponse.json(
        { error: `Invalid reward_type. Must be one of: ${validRewardTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const insertData: Record<string, unknown> = {
      name,
      points_cost,
      reward_type,
    }

    if (description !== undefined) insertData.description = description
    if (discount_value !== undefined) insertData.discount_value = discount_value
    if (icon !== undefined) insertData.icon = icon
    if (sort_order !== undefined) insertData.sort_order = sort_order
    if (min_tier !== undefined) insertData.min_tier = min_tier

    const { data, error } = await supabase
      .from('crm_loyalty_rewards')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reward: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH /api/operator/settings/loyalty-rewards - update a loyalty reward by id
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
      'name',
      'description',
      'points_cost',
      'reward_type',
      'discount_value',
      'free_product_id',
      'icon',
      'sort_order',
      'is_active',
      'min_tier',
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

    if (updateData.reward_type) {
      const validRewardTypes = ['free_delivery', 'discount', 'free_product']
      if (!validRewardTypes.includes(updateData.reward_type as string)) {
        return NextResponse.json(
          { error: `Invalid reward_type. Must be one of: ${validRewardTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('crm_loyalty_rewards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reward: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/operator/settings/loyalty-rewards - soft-delete a loyalty reward
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
      .from('crm_loyalty_rewards')
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
