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
  createProductWithFoodCost,
  updateProductWithFoodCost,
  listModifierGroups,
  setModifierGroupModifiers,
} from './repository';
import { deleteAllProductImages } from '@/lib/supabase/storage';

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
  createProduct: (data: ProductWriteInput) => Promise<Product>;
  updateProduct: (id: string, data: Partial<ProductWriteInput>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductAvailability: (id: string) => Promise<void>;
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
  createModifierGroup: (data: ModifierGroupWriteInput, modifierIds: string[]) => Promise<ModifierGroup>;
  updateModifierGroup: (id: string, data: Partial<ModifierGroupWriteInput>, modifierIds: string[]) => Promise<void>;
  deleteModifierGroup: (id: string) => Promise<void>;

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
        listModifierGroups(),
        modifiersRepository.findAll({ per_page: 200 }),
      ]);
      set({
        products: productsResult.data,
        categories: categoriesResult.data,
        modifierGroups: modifierGroupsResult,
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
    set((state) => ({ products: [...state.products, product] }));
    return product;
  },

  updateProduct: async (id, data) => {
    const updated = await updateProductWithFoodCost(id, data);
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
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
      modifiers: state.modifiers.map((m) => (m.id === id ? updated : m)),
      modifierGroups,
    }));
  },

  deleteModifier: async (id) => {
    await modifiersRepository.delete(id);
    const modifierGroups = await listModifierGroups();
    set((state) => ({
      modifiers: state.modifiers.filter((m) => m.id !== id),
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
