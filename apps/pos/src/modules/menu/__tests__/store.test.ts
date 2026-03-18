import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';

// ---- Mock functions (hoisted) ----
const mockProductsFindAll = vi.fn();
const mockCategoriesFindAll = vi.fn();
const mockModifierGroupsFindAll = vi.fn();
const mockModifiersFindAll = vi.fn();
const mockModifiersCreate = vi.fn();
const mockModifiersUpdate = vi.fn();
const mockModifiersDelete = vi.fn();
const mockListModifierGroups = vi.fn();
const mockSetModifierGroupModifiers = vi.fn();
const mockCreateProductWithFoodCost = vi.fn();
const mockUpdateProductWithFoodCost = vi.fn();
const mockToggleAvailability = vi.fn();
const mockReorderProductsInCategory = vi.fn();
const mockToggleMenuVisibility = vi.fn();

// Mock the repository module
vi.mock('../repository', () => ({
  productsRepository: {
    findAll: (...args: unknown[]) => mockProductsFindAll(...args),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  categoriesRepository: {
    findAll: (...args: unknown[]) => mockCategoriesFindAll(...args),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  modifierGroupsRepository: {
    findAll: (...args: unknown[]) => mockModifierGroupsFindAll(...args),
  },
  modifiersRepository: {
    findAll: (...args: unknown[]) => mockModifiersFindAll(...args),
    create: (...args: unknown[]) => mockModifiersCreate(...args),
    update: (...args: unknown[]) => mockModifiersUpdate(...args),
    delete: (...args: unknown[]) => mockModifiersDelete(...args),
  },
  listModifierGroups: (...args: unknown[]) => mockListModifierGroups(...args),
  setModifierGroupModifiers: (...args: unknown[]) => mockSetModifierGroupModifiers(...args),
  createProductWithFoodCost: (...args: unknown[]) => mockCreateProductWithFoodCost(...args),
  updateProductWithFoodCost: (...args: unknown[]) => mockUpdateProductWithFoodCost(...args),
  toggleAvailability: (...args: unknown[]) => mockToggleAvailability(...args),
  reorderProductsInCategory: (...args: unknown[]) => mockReorderProductsInCategory(...args),
  toggleMenuVisibility: (...args: unknown[]) => mockToggleMenuVisibility(...args),
}));

// Mock supabase storage
vi.mock('@/lib/supabase/storage', () => ({
  deleteAllProductImages: vi.fn(),
}));

import { useMenuStore } from '../store';

// ---- Test helpers ----
const makeModifier = (overrides: Partial<MenuModifier> = {}): MenuModifier => ({
  id: 'mod-001',
  name: 'Dodatkowy ser',
  price: 3,
  modifier_action: ModifierAction.ADD,
  is_available: true,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-1',
  name: 'Ramen',
  slug: 'ramen',
  category_id: 'cat-1',
  type: 'single',
  price: 39,
  images: [],
  is_available: true,
  is_featured: false,
  allergens: [],
  variants: [],
  modifier_groups: [],
  ingredients: [],
  sort_order: 0,
  sku: 'RAM-1',
  tax_rate: 8,
  is_active: true,
  point_ids: [],
  pricing: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('useMenuStore — Modifiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListModifierGroups.mockResolvedValue([]);
    useMenuStore.setState({
      modifiers: [],
      products: [],
      categories: [],
      modifierGroups: [],
      isLoading: false,
    });
  });

  describe('initial state', () => {
    it('modifiers starts as empty array', () => {
      expect(useMenuStore.getState().modifiers).toEqual([]);
    });
  });

  describe('loadModifiers', () => {
    it('calls modifiersRepository.findAll and sets state', async () => {
      const modifiers = [
        makeModifier({ id: 'mod-1', name: 'Ser' }),
        makeModifier({ id: 'mod-2', name: 'Bekon' }),
      ];
      mockModifiersFindAll.mockResolvedValue({ data: modifiers });

      await useMenuStore.getState().loadModifiers();

      expect(mockModifiersFindAll).toHaveBeenCalledOnce();
      expect(useMenuStore.getState().modifiers).toEqual(modifiers);
    });

    it('sets isLoading during fetch', async () => {
      let resolveFindAll!: (value: { data: MenuModifier[] }) => void;
      mockModifiersFindAll.mockReturnValue(
        new Promise<{ data: MenuModifier[] }>((resolve) => {
          resolveFindAll = resolve;
        })
      );

      const loadPromise = useMenuStore.getState().loadModifiers();
      expect(useMenuStore.getState().isLoading).toBe(true);

      resolveFindAll({ data: [] });
      await loadPromise;

      expect(useMenuStore.getState().isLoading).toBe(false);
    });
  });

  describe('createModifier', () => {
    it('calls create, adds to state, returns modifier', async () => {
      const newModifier = makeModifier({ id: 'mod-new' });
      mockModifiersCreate.mockResolvedValue(newModifier);

      const result = await useMenuStore.getState().createModifier({
        name: 'Dodatkowy ser',
        price: 3,
        modifier_action: ModifierAction.ADD,
        is_available: true,
        sort_order: 0,
      });

      expect(mockModifiersCreate).toHaveBeenCalledOnce();
      expect(result).toEqual(newModifier);
      expect(useMenuStore.getState().modifiers).toContainEqual(newModifier);
    });

    it('appends to existing modifiers', async () => {
      const existing = makeModifier({ id: 'mod-1', name: 'Existing' });
      useMenuStore.setState({ modifiers: [existing] });

      const newModifier = makeModifier({ id: 'mod-2', name: 'New' });
      mockModifiersCreate.mockResolvedValue(newModifier);

      await useMenuStore.getState().createModifier({
        name: 'New',
        price: 5,
        modifier_action: ModifierAction.ADD,
        is_available: true,
        sort_order: 1,
      });

      expect(useMenuStore.getState().modifiers).toHaveLength(2);
      expect(useMenuStore.getState().modifiers[0]).toEqual(existing);
      expect(useMenuStore.getState().modifiers[1]).toEqual(newModifier);
    });
  });

  describe('updateModifier', () => {
    it('calls update, replaces in state', async () => {
      const modifier = makeModifier({ id: 'mod-1', name: 'Old Name' });
      useMenuStore.setState({ modifiers: [modifier] });

      const updated = { ...modifier, name: 'New Name' };
      mockModifiersUpdate.mockResolvedValue(updated);

      await useMenuStore.getState().updateModifier('mod-1', { name: 'New Name' });

      expect(mockModifiersUpdate).toHaveBeenCalledWith('mod-1', { name: 'New Name' });
      const stateModifier = useMenuStore.getState().modifiers.find((m) => m.id === 'mod-1');
      expect(stateModifier?.name).toBe('New Name');
    });

    it('only replaces the matching modifier', async () => {
      const mod1 = makeModifier({ id: 'mod-1', name: 'Ser' });
      const mod2 = makeModifier({ id: 'mod-2', name: 'Bekon' });
      useMenuStore.setState({ modifiers: [mod1, mod2] });

      const updatedMod1 = { ...mod1, name: 'Extra Ser' };
      mockModifiersUpdate.mockResolvedValue(updatedMod1);

      await useMenuStore.getState().updateModifier('mod-1', { name: 'Extra Ser' });

      const state = useMenuStore.getState().modifiers;
      expect(state).toHaveLength(2);
      expect(state[0].name).toBe('Extra Ser');
      expect(state[1].name).toBe('Bekon');
    });
  });

  describe('deleteModifier', () => {
    it('calls delete, removes from state', async () => {
      const mod1 = makeModifier({ id: 'mod-1' });
      const mod2 = makeModifier({ id: 'mod-2' });
      useMenuStore.setState({ modifiers: [mod1, mod2] });

      mockModifiersDelete.mockResolvedValue(undefined);

      await useMenuStore.getState().deleteModifier('mod-1');

      expect(mockModifiersDelete).toHaveBeenCalledWith('mod-1');
      expect(useMenuStore.getState().modifiers).toHaveLength(1);
      expect(useMenuStore.getState().modifiers[0].id).toBe('mod-2');
    });
  });

  describe('loadAll includes modifiers', () => {
    it('loads modifiers alongside products, categories, and modifier groups', async () => {
      const modifiers = [makeModifier({ id: 'mod-all-1' })];
      mockProductsFindAll.mockResolvedValue({ data: [], total_pages: 1 });
      mockCategoriesFindAll.mockResolvedValue({ data: [], total_pages: 1 });
      mockListModifierGroups.mockResolvedValue([]);
      mockModifiersFindAll.mockResolvedValue({ data: modifiers, total_pages: 1 });

      await useMenuStore.getState().loadAll();

      expect(mockModifiersFindAll).toHaveBeenCalled();
      expect(useMenuStore.getState().modifiers).toEqual(modifiers);
    });

    it('loads all product pages before enabling reorder state', async () => {
      mockProductsFindAll
        .mockResolvedValueOnce({
          data: [makeProduct({ id: 'prod-1' })],
          total_pages: 2,
        })
        .mockResolvedValueOnce({
          data: [makeProduct({ id: 'prod-2', sort_order: 1 })],
          total_pages: 2,
        });
      mockCategoriesFindAll.mockResolvedValue({ data: [], total_pages: 1 });
      mockListModifierGroups.mockResolvedValue([]);
      mockModifiersFindAll.mockResolvedValue({ data: [], total_pages: 1 });

      await useMenuStore.getState().loadAll();

      expect(mockProductsFindAll).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ page: 1, per_page: 200 })
      );
      expect(mockProductsFindAll).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ page: 2, per_page: 200 })
      );
      expect(useMenuStore.getState().products.map((product) => product.id)).toEqual([
        'prod-1',
        'prod-2',
      ]);
    });
  });

  describe('product actions', () => {
    it('toggleProductAvailability replaces product in state', async () => {
      useMenuStore.setState({
        categories: [{ id: 'cat-1', name: 'Ramen', slug: 'ramen', sort_order: 0, is_active: true, created_at: '', updated_at: '' } as never],
        products: [makeProduct() as never],
      });

      mockToggleAvailability.mockResolvedValue({
        ...useMenuStore.getState().products[0],
        is_available: false,
      });

      await useMenuStore.getState().toggleProductAvailability('prod-1');

      expect(mockToggleAvailability).toHaveBeenCalledWith('prod-1');
      expect(useMenuStore.getState().products[0].is_available).toBe(false);
    });

    it('optimistically reorders category products and persists the change', async () => {
      useMenuStore.setState({
        categories: [
          { id: 'cat-1', name: 'Ramen', slug: 'ramen', sort_order: 0, is_active: true, created_at: '', updated_at: '' } as never,
          { id: 'cat-2', name: 'Bao', slug: 'bao', sort_order: 1, is_active: true, created_at: '', updated_at: '' } as never,
        ],
        products: [
          makeProduct({ id: 'prod-1', category_id: 'cat-1', sort_order: 0, name: 'A' }) as never,
          makeProduct({ id: 'prod-2', category_id: 'cat-1', sort_order: 1, name: 'B' }) as never,
          makeProduct({ id: 'prod-3', category_id: 'cat-2', sort_order: 0, name: 'C' }) as never,
        ],
      });
      mockReorderProductsInCategory.mockResolvedValue(undefined);

      await useMenuStore.getState().reorderProducts('cat-1', ['prod-2', 'prod-1']);

      expect(mockReorderProductsInCategory).toHaveBeenCalledWith('cat-1', ['prod-2', 'prod-1']);
      expect(useMenuStore.getState().products.map((product) => product.id)).toEqual([
        'prod-2',
        'prod-1',
        'prod-3',
      ]);
    });

    it('normalizes partial optimistic reorder payloads before saving', async () => {
      useMenuStore.setState({
        categories: [
          { id: 'cat-1', name: 'Ramen', slug: 'ramen', sort_order: 0, is_active: true, created_at: '', updated_at: '' } as never,
        ],
        products: [
          makeProduct({ id: 'prod-1', category_id: 'cat-1', sort_order: 0, name: 'A' }) as never,
          makeProduct({ id: 'prod-2', category_id: 'cat-1', sort_order: 1, name: 'B' }) as never,
          makeProduct({ id: 'prod-3', category_id: 'cat-1', sort_order: 2, name: 'C' }) as never,
        ],
      });
      mockReorderProductsInCategory.mockResolvedValue(undefined);

      await useMenuStore.getState().reorderProducts('cat-1', ['prod-3', 'prod-1']);

      expect(mockReorderProductsInCategory).toHaveBeenCalledWith('cat-1', [
        'prod-3',
        'prod-2',
        'prod-1',
      ]);
      expect(useMenuStore.getState().products.map((product) => product.id)).toEqual([
        'prod-3',
        'prod-2',
        'prod-1',
      ]);
    });

    it('rolls back optimistic reorder when persistence fails', async () => {
      useMenuStore.setState({
        categories: [
          { id: 'cat-1', name: 'Ramen', slug: 'ramen', sort_order: 0, is_active: true, created_at: '', updated_at: '' } as never,
        ],
        products: [
          makeProduct({ id: 'prod-1', category_id: 'cat-1', sort_order: 0, name: 'A' }) as never,
          makeProduct({ id: 'prod-2', category_id: 'cat-1', sort_order: 1, name: 'B' }) as never,
        ],
      });
      mockReorderProductsInCategory.mockRejectedValue(new Error('save failed'));

      await expect(
        useMenuStore.getState().reorderProducts('cat-1', ['prod-2', 'prod-1'])
      ).rejects.toThrow('save failed');

      expect(useMenuStore.getState().products.map((product) => product.id)).toEqual([
        'prod-1',
        'prod-2',
      ]);
    });
  });

  describe('product toggles', () => {
    it('toggleProductAvailability replaces product in state', async () => {
      useMenuStore.setState({
        products: [
          {
            id: 'prod-1',
            name: 'Ramen',
            slug: 'ramen',
            category_id: 'cat-1',
            type: 'single',
            price: 39,
            images: [],
            is_available: true,
            is_featured: false,
            allergens: [],
            variants: [],
            modifier_groups: [],
            ingredients: [],
            sort_order: 0,
            sku: 'RAM-1',
            tax_rate: 8,
            is_active: true,
            point_ids: [],
            pricing: [],
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          } as never,
        ],
      });

      mockToggleAvailability.mockResolvedValue({
        ...useMenuStore.getState().products[0],
        is_available: false,
      });

      await useMenuStore.getState().toggleProductAvailability('prod-1');

      expect(mockToggleAvailability).toHaveBeenCalledWith('prod-1');
      expect(useMenuStore.getState().products[0].is_available).toBe(false);
    });

    it('toggleProductMenuVisibility replaces product in state', async () => {
      useMenuStore.setState({
        products: [
          {
            id: 'prod-1',
            name: 'Ramen',
            slug: 'ramen',
            category_id: 'cat-1',
            type: 'single',
            price: 39,
            images: [],
            is_available: true,
            is_hidden_in_menu: false,
            is_featured: false,
            allergens: [],
            variants: [],
            modifier_groups: [],
            ingredients: [],
            sort_order: 0,
            sku: 'RAM-1',
            tax_rate: 8,
            is_active: true,
            point_ids: [],
            pricing: [],
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          } as never,
        ],
      });

      mockToggleMenuVisibility.mockResolvedValue({
        ...useMenuStore.getState().products[0],
        is_hidden_in_menu: true,
      });

      await useMenuStore.getState().toggleProductMenuVisibility('prod-1');

      expect(mockToggleMenuVisibility).toHaveBeenCalledWith('prod-1');
      expect(useMenuStore.getState().products[0].is_hidden_in_menu).toBe(true);
    });
  });
});
