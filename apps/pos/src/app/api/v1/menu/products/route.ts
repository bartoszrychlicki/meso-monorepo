import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { CreateProductSchema } from '@/schemas/menu';
import { createServiceClient } from '@/lib/supabase/server';
import type { Product, ProductWriteInput } from '@/types/menu';
import { SalesChannel } from '@/types/enums';
import { createProductWithFoodCost } from '@/modules/menu/repository';
import { setProductModifierGroupsWithClient } from '@/modules/menu/relations';
import type { Recipe } from '@/types/recipe';

/**
 * GET /api/v1/menu/products
 * List products with optional filtering and pagination.
 *
 * Query params:
 *   ?is_available=true|false - filter products by order availability
 *   ?is_hidden_in_menu=true|false - filter products by Delivery visibility
 *   ?channel=delivery     - filter products with pricing for this channel
 *   ?updated_since=ISO    - filter products updated after this date
 *   ?include=modifiers,variants,pricing - control response fields
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
  const isHiddenInMenu = searchParams.get('is_hidden_in_menu');
  const channel = searchParams.get('channel');
  const updatedSince = searchParams.get('updated_since');
  const include = searchParams.get('include');

  const serverProductsRepo = createServerRepository<Product>('products_catalog');

  const filters: Record<string, unknown> = {};
  if (categoryId) filters.category_id = categoryId;
  if (isAvailable !== null && isAvailable !== undefined && isAvailable !== '') {
    filters.is_available = isAvailable === 'true';
  }
  if (isHiddenInMenu !== null && isHiddenInMenu !== undefined && isHiddenInMenu !== '') {
    filters.is_hidden_in_menu = isHiddenInMenu === 'true';
  }

  let result = await serverProductsRepo.findAll({
    page,
    per_page: perPage,
    sort_by: 'sort_order',
    sort_order: 'asc',
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // Filter by channel - only products with pricing for this channel
  if (channel && Object.values(SalesChannel).includes(channel as SalesChannel)) {
    const filtered = result.data.filter(
      (p) => p.pricing?.some((pr) => pr.channel === channel)
    );
    result = { ...result, data: filtered, total: filtered.length };
  }

  // Filter by updated_since
  if (updatedSince) {
    const sinceDate = new Date(updatedSince).toISOString();
    const filtered = result.data.filter((p) => p.updated_at >= sinceDate);
    result = { ...result, data: filtered, total: filtered.length };
  }

  // Apply text search on top of filters if provided
  if (search) {
    const lowerSearch = search.toLowerCase();
    const filtered = result.data.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        (p.description?.toLowerCase().includes(lowerSearch) ?? false) ||
        p.sku?.toLowerCase().includes(lowerSearch)
    );
    result = { ...result, data: filtered, total: filtered.length };
  }

  // Apply include filter to control response fields
  let responseData: Partial<Product>[] = result.data;
  if (include) {
    const includeFields = new Set(include.split(',').map((s) => s.trim()));
    responseData = result.data.map((p) => {
      const base: Partial<Product> = {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        category_id: p.category_id,
        type: p.type,
        price: p.price,
        original_price: p.original_price,
        promo_label: p.promo_label,
        promo_starts_at: p.promo_starts_at,
        promo_ends_at: p.promo_ends_at,
        images: p.images,
        is_available: p.is_available,
        is_hidden_in_menu: p.is_hidden_in_menu,
        is_active: p.is_active,
        allergens: p.allergens,
        nutritional_info: p.nutritional_info,
        preparation_time_minutes: p.preparation_time_minutes,
        sort_order: p.sort_order,
        sku: p.sku,
        tax_rate: p.tax_rate,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
      if (includeFields.has('modifiers')) base.modifier_groups = p.modifier_groups;
      if (includeFields.has('variants')) base.variants = p.variants;
      if (includeFields.has('pricing')) base.pricing = p.pricing;
      return base;
    });
  }

  return apiSuccess(responseData, {
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

  const serviceClient = createServiceClient();
  const serverProductsRepo = createServerRepository<Product>('products');
  const serverRecipesRepo = createServerRepository<Recipe>('recipes');
  const catalogProductsRepo = createServerRepository<Product>('products_catalog');
  const payload = validation.data as ProductWriteInput;

  const product = await createProductWithFoodCost(payload, {
    productsRepo: serverProductsRepo,
    recipesRepo: serverRecipesRepo,
  });

  await setProductModifierGroupsWithClient(
    serviceClient,
    product.id,
    payload.modifier_group_ids ?? []
  );

  const createdProduct = await catalogProductsRepo.findById(product.id);
  return apiCreated(createdProduct ?? product);
}
