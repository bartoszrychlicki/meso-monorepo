import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { syncProductWithCurrentModifierState } from '@/lib/product-modifier-groups';
import { UpdateProductSchema } from '@/schemas/menu';
import { createServiceClient } from '@/lib/supabase/server';
import type { Product } from '@/types/menu';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/menu/products/:id
 * Get a single product by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverProductsRepo = createServerRepository<Product>('products');
  const product = await serverProductsRepo.findById(id);
  if (!product) return apiNotFound('Produkt');

  const syncedProduct = await syncProductWithCurrentModifierState(createServiceClient(), product);
  return apiSuccess(syncedProduct);
}

/**
 * PUT /api/v1/menu/products/:id
 * Update a product.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverProductsRepo = createServerRepository<Product>('products');
  const existing = await serverProductsRepo.findById(id);
  if (!existing) return apiNotFound('Produkt');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = UpdateProductSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const updated = await serverProductsRepo.update(id, validation.data as Partial<Product>);
  return apiSuccess(updated);
}

/**
 * DELETE /api/v1/menu/products/:id
 * Delete a product.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverProductsRepo = createServerRepository<Product>('products');
  const existing = await serverProductsRepo.findById(id);
  if (!existing) return apiNotFound('Produkt');

  await serverProductsRepo.delete(id);
  return apiSuccess({ deleted: true });
}
