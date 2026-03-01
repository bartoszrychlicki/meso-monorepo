import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Validate operator PIN from request header
function validateOperatorPin(request: NextRequest): boolean {
  const pin = request.headers.get('x-operator-pin')
  // In production, store hashed PIN in env or DB
  const validPin = process.env.OPERATOR_PIN || '0000'
  return pin === validPin
}

// GET /api/operator/settings/config - fetch all app config entries
export async function GET(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('app_config')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ config: data })
}

// PATCH /api/operator/settings/config - update one or more config entries
export async function PATCH(request: NextRequest) {
  if (!validateOperatorPin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    const body = await request.json()

    // Normalize to array: accept single { key, value } or array of { key, value }
    const entries = Array.isArray(body) ? body : [body]

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No config entries provided' }, { status: 400 })
    }

    for (const entry of entries) {
      if (!entry.key || entry.value === undefined) {
        return NextResponse.json(
          { error: 'Each entry must have a key and value' },
          { status: 400 }
        )
      }
    }

    const results: Record<string, unknown>[] = []
    const errors: string[] = []

    for (const entry of entries) {
      const { data, error } = await supabase
        .from('app_config')
        .upsert(
          {
            key: entry.key,
            value: entry.value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .select()
        .single()

      if (error) {
        errors.push(`Failed to update key "${entry.key}": ${error.message}`)
      } else {
        results.push(data)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    }

    return NextResponse.json({
      config: results,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
