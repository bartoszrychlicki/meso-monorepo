import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { productsRepository } from '@/modules/menu/repository';
import { CreateProductSchema } from '@/schemas/menu';

/**
 * GET /api/v1/menu/products
 * List products with optional filtering and pagination.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '50', 10), 100);
  const categoryId = searchParams.get('category_id');
  const search = searchParams.get('search');
  const isAvailable = searchParams.get('is_available');

  const filters: Record<string, unknown> = {};
  if (categoryId) filters.category_id = categoryId;
  if (isAvailable !== null && isAvailable !== undefined && isAvailable !== '') {
    filters.is_available = isAvailable === 'true';
  }

  let result = await productsRepository.findAll({
    page,
    per_page: perPage,
    sort_by: 'sort_order',
    sort_order: 'asc',
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // Apply text search on top of filters if provided
  if (search) {
    const lowerSearch = search.toLowerCase();
    result = {
      ...result,
      data: result.data.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          (p.description?.toLowerCase().includes(lowerSearch) ?? false) ||
          p.sku?.toLowerCase().includes(lowerSearch)
      ),
      total: result.data.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          (p.description?.toLowerCase().includes(lowerSearch) ?? false) ||
          p.sku?.toLowerCase().includes(lowerSearch)
      ).length,
    };
  }

  return apiSuccess(result.data, {
    total: result.total,
    page: result.page,
    per_page: result.per_page,
  });
}

/**
 * POST /api/v1/menu/products
 * Create a new product.
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

  const validation = CreateProductSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const product = await productsRepository.create(validation.data as any);
  return apiCreated(product);
}
