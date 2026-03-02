import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const TABLE_BY_TYPE = {
  delivery: 'orders_delivery_config',
  receipt: 'location_receipt_config',
  kds: 'location_kds_config',
} as const;

type LocationConfigType = keyof typeof TABLE_BY_TYPE;

function isLocationConfigType(value: unknown): value is LocationConfigType {
  return value === 'delivery' || value === 'receipt' || value === 'kds';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as
      | { type?: unknown; locationId?: unknown; data?: unknown }
      | null;

    if (!body || !isLocationConfigType(body.type)) {
      return NextResponse.json(
        { error: 'Invalid request: unsupported config type' },
        { status: 400 }
      );
    }

    if (typeof body.locationId !== 'string' || body.locationId.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: locationId is required' },
        { status: 400 }
      );
    }

    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'Invalid request: config data is required' },
        { status: 400 }
      );
    }

    const table = TABLE_BY_TYPE[body.type];
    const service = createServiceClient();
    const payload = body.data as Record<string, unknown>;

    const { data: existing, error: existingError } = await service
      .from(table)
      .select('*')
      .eq('location_id', body.locationId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      const { data: updated, error: updateError } = await service
        .from(table)
        .update(payload)
        .eq('location_id', body.locationId)
        .select('*')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ data: updated });
    }

    const { data: created, error: createError } = await service
      .from(table)
      .insert({ ...payload, location_id: body.locationId })
      .select('*')
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
