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
const mockCreateProductWithFoodCost = vi.fn();
const mockUpdateProductWithFoodCost = vi.fn();

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
  createProductWithFoodCost: (...args: unknown[]) => mockCreateProductWithFoodCost(...args),
  updateProductWithFoodCost: (...args: unknown[]) => mockUpdateProductWithFoodCost(...args),
  toggleAvailability: vi.fn(),
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

describe('useMenuStore — Modifiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockProductsFindAll.mockResolvedValue({ data: [] });
      mockCategoriesFindAll.mockResolvedValue({ data: [] });
      mockModifierGroupsFindAll.mockResolvedValue({ data: [] });
      mockModifiersFindAll.mockResolvedValue({ data: modifiers });

      await useMenuStore.getState().loadAll();

      expect(mockModifiersFindAll).toHaveBeenCalled();
      expect(useMenuStore.getState().modifiers).toEqual(modifiers);
    });
  });
});
