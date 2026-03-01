import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Validate operator PIN from request header
function validateOperatorPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-operator-pin')
  // In production, store hashed PIN in env or DB
  const validPin = process.env.OPERATOR_PIN || '0000'
  return pin === validPin
}

// GET /api/operator/settings/location - fetch default location
export async function GET(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users_locations')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ location: data })
}

// PATCH /api/operator/settings/location - update location settings
export async function PATCH(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const allowedFields = [
      'name',
      'address',
      'city',
      'delivery_fee',
      'min_order_value',
      'delivery_time_min',
      'delivery_time_max',
      'open_time',
      'close_time',
      'delivery_radius_km',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users_locations')
      .update(updateData)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
