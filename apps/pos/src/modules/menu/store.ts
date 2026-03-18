'use client';

import { create } from 'zustand';
import { Product, Category, ModifierGroup, MenuModifier } from '@/types/menu';
import {
  productsRepository,
  categoriesRepository,
  modifierGroupsRepository,
  modifiersRepository,
  toggleAvailability,
  createProductWithFoodCost,
  updateProductWithFoodCost,
  reorderProductsInCategory,
} from './repository';
import { deleteAllProductImages } from '@/lib/supabase/storage';
import { applyCategoryReorder, sortProductsForMenu } from './utils/sort-order';

interface MenuStore {
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  modifiers: MenuModifier[];
  selectedCategoryId: string | null;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  createProduct: (data: Omit<Product, 'created_at' | 'updated_at'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductAvailability: (id: string) => Promise<void>;
  reorderProducts: (categoryId: string, productIds: string[]) => Promise<void>;
  createCategory: (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setSelectedCategory: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Modifier actions
  loadModifiers: () => Promise<void>;
  createModifier: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
  updateModifier: (id: string, data: Partial<MenuModifier>) => Promise<void>;
  deleteModifier: (id: string) => Promise<void>;

  // Computed
  filteredProducts: () => Product[];
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  products: [],
  categories: [],
  modifierGroups: [],
  modifiers: [],
  selectedCategoryId: null,
  searchQuery: '',
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [productsResult, categoriesResult, modifierGroupsResult, modifiersResult] = await Promise.all([
        productsRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 200 }),
        categoriesRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 100 }),
        modifierGroupsRepository.findAll({ per_page: 100 }),
        modifiersRepository.findAll({ per_page: 200 }),
      ]);
      const sortedCategories = [...categoriesResult.data].sort(
        (left, right) => left.sort_order - right.sort_order
      );
      set({
        products: sortProductsForMenu(productsResult.data, sortedCategories),
        categories: sortedCategories,
        modifierGroups: modifierGroupsResult.data,
        modifiers: modifiersResult.data,
        isLoading: false,
      });
    } catch (error) {
      console.error('[MenuStore] loadAll failed:', error);
      set({ isLoading: false });
    }
  },

  createProduct: async (data) => {
    const product = await createProductWithFoodCost(data);
    set((state) => ({
      products: sortProductsForMenu([...state.products, product], state.categories),
    }));
    return product;
  },

  updateProduct: async (id, data) => {
    const updated = await updateProductWithFoodCost(id, data);
    set((state) => ({
      products: sortProductsForMenu(
        state.products.map((p) => (p.id === id ? updated : p)),
        state.categories
      ),
    }));
  },

  deleteProduct: async (id) => {
    await deleteAllProductImages(id);
    await productsRepository.delete(id);
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  toggleProductAvailability: async (id) => {
    const updated = await toggleAvailability(id);
    set((state) => ({
      products: sortProductsForMenu(
        state.products.map((p) => (p.id === id ? updated : p)),
        state.categories
      ),
    }));
  },

  reorderProducts: async (categoryId, productIds) => {
    const previousProducts = get().products;
    const optimisticProducts = sortProductsForMenu(
      applyCategoryReorder(previousProducts, categoryId, productIds),
      get().categories
    );

    set({ products: optimisticProducts });

    try {
      await reorderProductsInCategory(categoryId, productIds);
    } catch (error) {
      set({ products: previousProducts });
      throw error;
    }
  },

  createCategory: async (data) => {
    const category = await categoriesRepository.create(data);
    set((state) => {
      const categories = [...state.categories, category].sort(
        (left, right) => left.sort_order - right.sort_order
      );
      return {
        categories,
        products: sortProductsForMenu(state.products, categories),
      };
    });
    return category;
  },

  updateCategory: async (id, data) => {
    const updated = await categoriesRepository.update(id, data);
    set((state) => {
      const categories = state.categories
        .map((c) => (c.id === id ? updated : c))
        .sort((left, right) => left.sort_order - right.sort_order);

      return {
        categories,
        products: sortProductsForMenu(state.products, categories),
      };
    });
  },

  deleteCategory: async (id) => {
    await categoriesRepository.delete(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      selectedCategoryId: state.selectedCategoryId === id ? null : state.selectedCategoryId,
    }));
  },

  loadModifiers: async () => {
    set({ isLoading: true });
    try {
      const result = await modifiersRepository.findAll({ per_page: 200 });
      set({ modifiers: result.data, isLoading: false });
    } catch (error) {
      console.error('[MenuStore] loadModifiers failed:', error);
      set({ isLoading: false });
    }
  },

  createModifier: async (data) => {
    const modifier = await modifiersRepository.create(data);
    set((state) => ({ modifiers: [...state.modifiers, modifier] }));
    return modifier;
  },

  updateModifier: async (id, data) => {
    const updated = await modifiersRepository.update(id, data);
    set((state) => ({
      modifiers: state.modifiers.map((m) => (m.id === id ? updated : m)),
    }));
  },

  deleteModifier: async (id) => {
    await modifiersRepository.delete(id);
    set((state) => ({
      modifiers: state.modifiers.filter((m) => m.id !== id),
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
