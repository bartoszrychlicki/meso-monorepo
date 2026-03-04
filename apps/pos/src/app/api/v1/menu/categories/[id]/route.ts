import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { UpdateCategorySchema } from '@/schemas/menu';
import type { Category } from '@/types/menu';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/menu/categories/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverCategoriesRepo = createServerRepository<Category>('categories');
  const category = await serverCategoriesRepo.findById(id);
  if (!category) return apiNotFound('Kategoria');

  return apiSuccess(category);
}

/**
 * PUT /api/v1/menu/categories/:id
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverCategoriesRepo = createServerRepository<Category>('categories');
  const existing = await serverCategoriesRepo.findById(id);
  if (!existing) return apiNotFound('Kategoria');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = UpdateCategorySchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const updated = await serverCategoriesRepo.update(id, validation.data as Partial<Category>);
  return apiSuccess(updated);
}

/**
 * DELETE /api/v1/menu/categories/:id
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverCategoriesRepo = createServerRepository<Category>('categories');
  const existing = await serverCategoriesRepo.findById(id);
  if (!existing) return apiNotFound('Kategoria');

  await serverCategoriesRepo.delete(id);
  return apiSuccess({ deleted: true });
}
