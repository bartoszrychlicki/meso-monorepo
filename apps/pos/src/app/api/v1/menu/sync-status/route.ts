import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { apiSuccess } from '@/lib/api/response';
import { productsRepository, categoriesRepository } from '@/modules/menu/repository';

/**
 * GET /api/v1/menu/sync-status
 * Returns menu sync metadata including a hash for change detection.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'menu:read');
  if (!isApiKey(auth)) return auth;

  const allProducts = await productsRepository.findAll({
    page: 1,
    per_page: 10000,
    sort_by: 'id',
    sort_order: 'asc',
  });
  const allCategories = await categoriesRepository.findAll({
    page: 1,
    per_page: 10000,
    sort_by: 'id',
    sort_order: 'asc',
  });

  // Compute SHA-256 hash of all product data for change detection
  const hashPayload = JSON.stringify({
    products: allProducts.data,
    categories: allCategories.data,
  });
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(hashPayload)
  );
  const syncHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Find the most recent updated_at timestamp
  const allTimestamps = [
    ...allProducts.data.map((p) => p.updated_at),
    ...allCategories.data.map((c) => c.updated_at),
  ].filter(Boolean);
  const lastUpdated =
    allTimestamps.length > 0
      ? allTimestamps.sort().reverse()[0]
      : new Date().toISOString();

  return apiSuccess({
    last_updated: lastUpdated,
    product_count: allProducts.total,
    category_count: allCategories.total,
    sync_hash: syncHash,
  });
}
