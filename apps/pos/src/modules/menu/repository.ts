import { Product, Category, ModifierGroup, MenuModifier } from '@/types/menu';
import { createRepository } from '@/lib/data/repository-factory';
import { supabase } from '@/lib/supabase/client';

export const productsRepository = createRepository<Product>('products');
export const categoriesRepository = createRepository<Category>('categories');
export const modifierGroupsRepository = createRepository<ModifierGroup>('modifier_groups');
export const modifiersRepository = createRepository<MenuModifier>('modifiers');

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

/** Get modifier IDs for a product (ordered by per-product sort_order) */
export async function getProductModifierIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_modifiers')
    .select('modifier_id')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getProductModifierIds failed: ${error.message}`);
  return (data ?? []).map((row: { modifier_id: string }) => row.modifier_id);
}

/** Set modifiers for a product (replace all) */
export async function setProductModifiers(productId: string, modifierIds: string[]): Promise<void> {
  const { error: delError } = await supabase
    .from('product_modifiers')
    .delete()
    .eq('product_id', productId);
  if (delError) throw new Error(`setProductModifiers delete failed: ${delError.message}`);

  if (modifierIds.length > 0) {
    const rows = modifierIds.map((modifier_id, index) => ({
      product_id: productId,
      modifier_id,
      sort_order: index,
    }));
    const { error: insError } = await supabase
      .from('product_modifiers')
      .insert(rows);
    if (insError) throw new Error(`setProductModifiers insert failed: ${insError.message}`);
  }
}

/** Get modifiers for a product (full objects, ordered by per-product sort_order) */
export async function getProductModifiers(productId: string): Promise<MenuModifier[]> {
  const { data, error } = await supabase
    .from('product_modifiers')
    .select('modifier_id, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getProductModifiers failed: ${error.message}`);
  if (!data || data.length === 0) return [];

  const orderedIds: string[] = data.map((row: { modifier_id: string }) => row.modifier_id);
  const { data: modifiers, error: modError } = await supabase
    .from('menu_modifiers')
    .select('*')
    .in('id', orderedIds);
  if (modError) throw new Error(`getProductModifiers fetch failed: ${modError.message}`);

  // Re-sort by junction sort_order (orderedIds preserves that order)
  const modMap = new Map((modifiers ?? []).map((m: MenuModifier) => [m.id, m]));
  return orderedIds.map((id: string) => modMap.get(id)).filter(Boolean) as MenuModifier[];
}

/** Count products using a modifier */
export async function countProductsUsingModifier(modifierId: string): Promise<number> {
  const { count, error } = await supabase
    .from('product_modifiers')
    .select('product_id', { count: 'exact', head: true })
    .eq('modifier_id', modifierId);
  if (error) throw new Error(`countProductsUsingModifier failed: ${error.message}`);
  return count ?? 0;
}
