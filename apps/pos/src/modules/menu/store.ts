'use client';

import { create } from 'zustand';
import {
  Product,
  Category,
  ModifierGroup,
  MenuModifier,
  type ModifierGroupWriteInput,
  type ProductWriteInput,
} from '@/types/menu';
import {
  productsRepository,
  categoriesRepository,
  modifierGroupsRepository,
  modifiersRepository,
  toggleAvailability,
  toggleMenuVisibility,
  createProductWithFoodCost,
  updateProductWithFoodCost,
  listModifierGroups,
  reorderProductsInCategory,
  setModifierGroupModifiers,
} from './repository';
import { deleteAllProductImages } from '@/lib/supabase/storage';
import { applyCategoryReorder, sortProductsForMenu } from './utils/sort-order';
import type { PaginatedResult } from '@/types/common';
import { expandCategoryReorder } from './utils/reorder';

async function loadAllPages<T>(
  loadPage: (page: number, perPage: number) => Promise<PaginatedResult<T>>,
  perPage: number
): Promise<T[]> {
  const firstPage = await loadPage(1, perPage);
  const allItems = [...firstPage.data];
  const totalPages = firstPage.total_pages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await loadPage(page, perPage);
    allItems.push(...nextPage.data);
  }

  return allItems;
}

interface MenuStore {
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  modifiers: MenuModifier[];
  selectedCategoryId: string | null;
  searchQuery: string;
  isLoading: boolean;
  loadAll: () => Promise<void>;
  createProduct: (data: ProductWriteInput) => Promise<Product>;
  updateProduct: (id: string, data: Partial<ProductWriteInput>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductAvailability: (id: string) => Promise<void>;
  toggleProductMenuVisibility: (id: string) => Promise<void>;
  reorderProducts: (categoryId: string, productIds: string[]) => Promise<void>;
  createCategory: (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setSelectedCategory: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  loadModifiers: () => Promise<void>;
  createModifier: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
  updateModifier: (id: string, data: Partial<MenuModifier>) => Promise<void>;
  deleteModifier: (id: string) => Promise<void>;
  createModifierGroup: (data: ModifierGroupWriteInput, modifierIds: string[]) => Promise<ModifierGroup>;
  updateModifierGroup: (id: string, data: Partial<ModifierGroupWriteInput>, modifierIds: string[]) => Promise<void>;
  deleteModifierGroup: (id: string) => Promise<void>;
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
      const [products, categories, modifierGroups, modifiers] = await Promise.all([
        loadAllPages(
          (page, perPage) =>
            productsRepository.findAll({
              page,
              per_page: perPage,
              sort_by: 'sort_order',
              sort_order: 'asc',
            }),
          200
        ),
        loadAllPages(
          (page, perPage) =>
            categoriesRepository.findAll({
              page,
              per_page: perPage,
              sort_by: 'sort_order',
              sort_order: 'asc',
            }),
          100
        ),
        listModifierGroups(),
        loadAllPages(
          (page, perPage) => modifiersRepository.findAll({ page, per_page: perPage }),
          200
        ),
      ]);

      const sortedCategories = [...categories].sort(
        (left, right) => left.sort_order - right.sort_order
      );

      set({
        products: sortProductsForMenu(products, sortedCategories),
        categories: sortedCategories,
        modifierGroups,
        modifiers,
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
        state.products.map((product) => (product.id === id ? updated : product)),
        state.categories
      ),
    }));
  },

  deleteProduct: async (id) => {
    await deleteAllProductImages(id);
    await productsRepository.delete(id);
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    }));
  },

  toggleProductAvailability: async (id) => {
    const updated = await toggleAvailability(id);
    set((state) => ({
      products: sortProductsForMenu(
        state.products.map((product) => (product.id === id ? updated : product)),
        state.categories
      ),
    }));
  },

  toggleProductMenuVisibility: async (id) => {
    const updated = await toggleMenuVisibility(id);
    set((state) => ({
      products: state.products.map((product) => (product.id === id ? updated : product)),
    }));
  },

  reorderProducts: async (categoryId, productIds) => {
    const previousProducts = get().products;
    const normalizedProductIds = expandCategoryReorder(
      previousProducts
        .filter((product) => product.category_id === categoryId)
        .map((product) => product.id),
      productIds
    );
    const optimisticProducts = sortProductsForMenu(
      applyCategoryReorder(previousProducts, categoryId, normalizedProductIds),
      get().categories
    );

    set({ products: optimisticProducts });

    try {
      await reorderProductsInCategory(categoryId, normalizedProductIds);
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
        .map((category) => (category.id === id ? updated : category))
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
      categories: state.categories.filter((category) => category.id !== id),
      selectedCategoryId: state.selectedCategoryId === id ? null : state.selectedCategoryId,
    }));
  },

  loadModifiers: async () => {
    set({ isLoading: true });
    try {
      const [modifiersResult, modifierGroupsResult] = await Promise.all([
        modifiersRepository.findAll({ per_page: 200 }),
        listModifierGroups(),
      ]);
      set({
        modifiers: modifiersResult.data,
        modifierGroups: modifierGroupsResult,
        isLoading: false,
      });
    } catch (error) {
      console.error('[MenuStore] loadModifiers failed:', error);
      set({ isLoading: false });
    }
  },

  createModifier: async (data) => {
    const modifier = await modifiersRepository.create(data);
    const modifierGroups = await listModifierGroups();
    set((state) => ({
      modifiers: [...state.modifiers, modifier],
      modifierGroups,
    }));
    return modifier;
  },

  updateModifier: async (id, data) => {
    const updated = await modifiersRepository.update(id, data);
    const modifierGroups = await listModifierGroups();
    set((state) => ({
      modifiers: state.modifiers.map((modifier) => (modifier.id === id ? updated : modifier)),
      modifierGroups,
    }));
  },

  deleteModifier: async (id) => {
    await modifiersRepository.delete(id);
    const modifierGroups = await listModifierGroups();
    set((state) => ({
      modifiers: state.modifiers.filter((modifier) => modifier.id !== id),
      modifierGroups,
    }));
  },

  createModifierGroup: async (data, modifierIds) => {
    const group = await modifierGroupsRepository.create(
      data as unknown as Omit<ModifierGroup, 'id' | 'created_at' | 'updated_at'>
    );
    await setModifierGroupModifiers(group.id, modifierIds);
    const modifierGroups = await listModifierGroups();
    const createdGroup = modifierGroups.find((item) => item.id === group.id) ?? { ...group, modifiers: [] };
    set({ modifierGroups });
    return createdGroup;
  },

  updateModifierGroup: async (id, data, modifierIds) => {
    await modifierGroupsRepository.update(id, data);
    await setModifierGroupModifiers(id, modifierIds);
    const modifierGroups = await listModifierGroups();
    set({ modifierGroups });
  },

  deleteModifierGroup: async (id) => {
    await modifierGroupsRepository.delete(id);
    const modifierGroups = await listModifierGroups();
    set({ modifierGroups });
  },

  setSelectedCategory: (id) => set({ selectedCategoryId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  filteredProducts: () => {
    const { products, selectedCategoryId, searchQuery } = get();
    let filtered = products;

    if (selectedCategoryId) {
      filtered = filtered.filter((product) => product.category_id === selectedCategoryId);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerQuery) ||
          (product.description?.toLowerCase().includes(lowerQuery) ?? false)
      );
    }

    return filtered;
  },
}));
