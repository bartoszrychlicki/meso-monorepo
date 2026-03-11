import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { PosbistroMenuMappingSchema } from '@/schemas/posbistro';
import {
  deletePosbistroMenuMapping,
  getPosbistroMenuMappingById,
  upsertPosbistroMenuMapping,
} from '@/lib/integrations/posbistro/menu-mapping';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const mapping = await getPosbistroMenuMappingById(id);
  if (!mapping) return apiNotFound('Mapowanie POSBistro');

  return apiSuccess(mapping);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const existing = await getPosbistroMenuMappingById(id);
  if (!existing) return apiNotFound('Mapowanie POSBistro');

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

  return apiSuccess(mapping);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const existing = await getPosbistroMenuMappingById(id);
  if (!existing) return apiNotFound('Mapowanie POSBistro');

  await deletePosbistroMenuMapping(id);
  return apiSuccess({ deleted: true });
}
