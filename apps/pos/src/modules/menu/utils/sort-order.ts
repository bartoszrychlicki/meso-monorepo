import type { Category, Product } from '@/types/menu';

function compareProductsWithinCategory(left: Product, right: Product): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  return left.name.localeCompare(right.name, 'pl');
}

export function sortProductsForMenu(products: Product[], categories: Category[]): Product[] {
  const categoryOrder = new Map(
    categories
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((category, index) => [category.id, category.sort_order ?? index])
  );

  return [...products].sort((left, right) => {
    const leftCategoryOrder = categoryOrder.get(left.category_id) ?? Number.MAX_SAFE_INTEGER;
    const rightCategoryOrder = categoryOrder.get(right.category_id) ?? Number.MAX_SAFE_INTEGER;

    if (leftCategoryOrder !== rightCategoryOrder) {
      return leftCategoryOrder - rightCategoryOrder;
    }

    return compareProductsWithinCategory(left, right);
  });
}

export function applyCategoryReorder(
  products: Product[],
  categoryId: string,
  orderedIds: string[]
): Product[] {
  const sortOrderById = new Map(orderedIds.map((id, index) => [id, index]));

  return products.map((product) => {
    if (product.category_id !== categoryId) {
      return product;
    }

    const nextSortOrder = sortOrderById.get(product.id);
    if (nextSortOrder === undefined) {
      return product;
    }

    return {
      ...product,
      sort_order: nextSortOrder,
    };
  });
}
