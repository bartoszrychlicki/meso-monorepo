import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiCreated,
  apiError,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { PosbistroMenuMappingSchema } from '@/schemas/posbistro';
import {
  listPosbistroMenuMappings,
  upsertPosbistroMenuMapping,
} from '@/lib/integrations/posbistro/menu-mapping';

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const mappings = await listPosbistroMenuMappings({
    mapping_type: searchParams.get('mapping_type') as 'product' | 'variant' | 'modifier' | null,
    meso_product_id: searchParams.get('meso_product_id'),
    meso_variant_id: searchParams.get('meso_variant_id'),
    meso_modifier_id: searchParams.get('meso_modifier_id'),
    is_active: searchParams.has('is_active')
      ? searchParams.get('is_active') === 'true'
      : undefined,
  });

  return apiSuccess(mappings);
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = PosbistroMenuMappingSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  const mapping = await upsertPosbistroMenuMapping({
    mapping_type: validation.data.mapping_type,
    meso_product_id: validation.data.meso_product_id ?? null,
    meso_variant_id: validation.data.meso_variant_id ?? null,
    meso_modifier_id: validation.data.meso_modifier_id ?? null,
    posbistro_product_type: validation.data.posbistro_product_type ?? 'SIMPLE',
    posbistro_variation_id: validation.data.posbistro_variation_id ?? null,
    posbistro_variation_sku: validation.data.posbistro_variation_sku ?? null,
    posbistro_addon_id: validation.data.posbistro_addon_id ?? null,
    posbistro_addon_sku: validation.data.posbistro_addon_sku ?? null,
    posbistro_name: validation.data.posbistro_name ?? null,
    notes: validation.data.notes ?? null,
    is_active: validation.data.is_active ?? true,
  });

  return apiCreated(mapping);
}
