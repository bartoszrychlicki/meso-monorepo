'use client';

import { create } from 'zustand';
import { Product, Category, ModifierGroup } from '@/types/menu';
import {
  productsRepository,
  categoriesRepository,
  modifierGroupsRepository,
  toggleAvailability,
} from './repository';

interface MenuStore {
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  selectedCategoryId: string | null;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  createProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductAvailability: (id: string) => Promise<void>;
  createCategory: (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setSelectedCategory: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Computed
  filteredProducts: () => Product[];
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  products: [],
  categories: [],
  modifierGroups: [],
  selectedCategoryId: null,
  searchQuery: '',
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [productsResult, categoriesResult, modifierGroupsResult] = await Promise.all([
        productsRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 200 }),
        categoriesRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 100 }),
        modifierGroupsRepository.findAll({ per_page: 100 }),
      ]);
      set({
        products: productsResult.data,
        categories: categoriesResult.data,
        modifierGroups: modifierGroupsResult.data,
        isLoading: false,
      });
    } catch (error) {
      console.error('[MenuStore] loadAll failed:', error);
      set({ isLoading: false });
    }
  },

  createProduct: async (data) => {
    const product = await productsRepository.create(data);
    set((state) => ({ products: [...state.products, product] }));
    return product;
  },

  updateProduct: async (id, data) => {
    const updated = await productsRepository.update(id, data);
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deleteProduct: async (id) => {
    await productsRepository.delete(id);
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  toggleProductAvailability: async (id) => {
    const updated = await toggleAvailability(id);
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }));
  },

  createCategory: async (data) => {
    const category = await categoriesRepository.create(data);
    set((state) => ({ categories: [...state.categories, category] }));
    return category;
  },

  updateCategory: async (id, data) => {
    const updated = await categoriesRepository.update(id, data);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCategory: async (id) => {
    await categoriesRepository.delete(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      selectedCategoryId: state.selectedCategoryId === id ? null : state.selectedCategoryId,
    }));
  },

  setSelectedCategory: (id) => set({ selectedCategoryId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  filteredProducts: () => {
    const { products, selectedCategoryId, searchQuery } = get();
    let filtered = products;

    if (selectedCategoryId) {
      filtered = filtered.filter((p) => p.category_id === selectedCategoryId);
    }

    if (searchQuery) {
      const lq = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lq) ||
          (p.description?.toLowerCase().includes(lq) ?? false)
      );
    }

    return filtered;
  },
}));
