'use client';

import { useEffect } from 'react';
import { useMenuStore } from './store';

export function useMenu() {
  const store = useMenuStore();

  useEffect(() => {
    if (store.products.length === 0 && !store.isLoading) {
      store.loadAll();
    }
  }, []);

  return {
    products: store.filteredProducts(),
    allProducts: store.products,
    categories: store.categories,
    modifierGroups: store.modifierGroups,
    selectedCategoryId: store.selectedCategoryId,
    searchQuery: store.searchQuery,
    isLoading: store.isLoading,
    loadAll: store.loadAll,
    createProduct: store.createProduct,
    updateProduct: store.updateProduct,
    deleteProduct: store.deleteProduct,
    toggleProductAvailability: store.toggleProductAvailability,
    createCategory: store.createCategory,
    updateCategory: store.updateCategory,
    deleteCategory: store.deleteCategory,
    setSelectedCategory: store.setSelectedCategory,
    setSearchQuery: store.setSearchQuery,
  };
}

export function useProduct(id: string) {
  const store = useMenuStore();

  useEffect(() => {
    if (store.products.length === 0 && !store.isLoading) {
      store.loadAll();
    }
  }, []);

  const product = store.products.find((p) => p.id === id) ?? null;
  const category = product
    ? store.categories.find((c) => c.id === product.category_id) ?? null
    : null;

  return {
    product,
    category,
    isLoading: store.isLoading,
    updateProduct: store.updateProduct,
    deleteProduct: store.deleteProduct,
  };
}

export function useCategories() {
  const store = useMenuStore();

  useEffect(() => {
    if (store.categories.length === 0 && !store.isLoading) {
      store.loadAll();
    }
  }, []);

  return {
    categories: store.categories,
    isLoading: store.isLoading,
  };
}
