import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { categoriesRepository } from '@/modules/menu/repository';
import { CreateCategorySchema } from '@/schemas/menu';

/**
 * GET /api/v1/menu/categories
 * List all categories.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '50', 10), 100);

  const result = await categoriesRepository.findAll({
    page,
    per_page: perPage,
    sort_by: 'sort_order',
    sort_order: 'asc',
  });

  return apiSuccess(result.data, {
    total: result.total,
    page: result.page,
    per_page: result.per_page,
  });
}

/**
 * POST /api/v1/menu/categories
 * Create a new category.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'menu:write');
  if (!isApiKey(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = CreateCategorySchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const category = await categoriesRepository.create(validation.data);
  return apiCreated(category);
}
