import { NextRequest } from 'next/server';
import {
  apiError,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { ReorderMenuProductsSchema } from '@/schemas/menu';
import { createServiceClient } from '@/lib/supabase/server';
import { authorizeMenuRoute } from '@/modules/menu/server/route-auth';
import { expandCategoryReorder } from '@/modules/menu/utils/reorder';

export async function POST(request: NextRequest) {
  const auth = await authorizeMenuRoute(request, 'menu:write');
  if ('status' in auth) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidlowe dane JSON w tresci zadania', 400);
  }

  const validation = ReorderMenuProductsSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  const { category_id, product_ids } = validation.data;
  const serviceClient = createServiceClient();

  const { data: categoryProducts, error: categoryProductsError } = await serviceClient
    .from('menu_products')
    .select('id')
    .eq('category_id', category_id)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (categoryProductsError) {
    return apiError('DB_ERROR', 'Nie udalo sie pobrac produktow kategorii', 500);
  }

  const existingIds = (categoryProducts ?? []).map((product) => product.id);
  const foreignIds = product_ids.filter((id) => !existingIds.includes(id));

  if (foreignIds.length > 0) {
    return apiValidationError([
      {
        field: 'product_ids',
        message: 'Lista produktow moze zawierac tylko produkty z wybranej kategorii',
      },
    ]);
  }

  const normalizedProductIds = expandCategoryReorder(existingIds, product_ids);

  const { error } = await serviceClient.rpc('reorder_menu_products', {
    p_category_id: category_id,
    p_product_ids: normalizedProductIds,
  });

  if (error) {
    return apiError('DB_ERROR', 'Nie udalo sie zapisac nowej kolejnosci produktow', 500);
  }

  return apiSuccess({
    category_id,
    product_ids: normalizedProductIds,
    updated: true,
  });
}
