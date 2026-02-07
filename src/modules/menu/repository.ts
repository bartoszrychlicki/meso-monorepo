import { Product, Category, ModifierGroup } from '@/types/menu';
import { createRepository } from '@/lib/data/repository-factory';

export const productsRepository = createRepository<Product>('products');
export const categoriesRepository = createRepository<Category>('categories');
export const modifierGroupsRepository = createRepository<ModifierGroup>('modifier_groups');

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  return productsRepository.findMany((p) => p.category_id === categoryId && p.is_available);
}

export async function getActiveProducts(): Promise<Product[]> {
  return productsRepository.findMany((p) => p.is_available);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const lowerQuery = query.toLowerCase();
  return productsRepository.findMany(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

export async function toggleAvailability(productId: string): Promise<Product> {
  const product = await productsRepository.findById(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  return productsRepository.update(productId, { is_available: !product.is_available });
}
