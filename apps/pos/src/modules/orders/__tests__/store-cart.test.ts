import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModifierAction } from '@/types/enums';

// Mock the orders repository
vi.mock('../repository', () => ({
  ordersRepository: {
    findAll: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getActiveOrders: vi.fn().mockResolvedValue([]),
    generateOrderNumber: vi.fn().mockResolvedValue('ZAM-001'),
    updateStatus: vi.fn(),
  },
}));

// Mock the repository factory (used for kitchen_tickets)
vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: vi.fn(() => ({
    findAll: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    findById: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  })),
}));

import { useOrdersStore } from '../store';
import { Product } from '@/types/menu';
import { OrderItemModifier } from '@/types/order';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Cheeseburger',
  slug: 'cheeseburger',
  category_id: 'cat-1',
  type: 'simple' as any,
  price: 24.99,
  images: [],
  is_available: true,
  is_featured: false,
  allergens: [],
  variants: [],
  modifier_groups: [],
  ingredients: [],
  sort_order: 0,
  sku: 'SKU-001',
  tax_rate: 0.08,
  is_active: true,
  point_ids: [],
  pricing: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockModifiers: OrderItemModifier[] = [
  {
    modifier_id: 'mod-1',
    name: 'Extra Ser',
    price: 3.5,
    quantity: 1,
    modifier_action: ModifierAction.ADD,
  },
  {
    modifier_id: 'mod-2',
    name: 'Dodatkowy Bekon',
    price: 5.0,
    quantity: 1,
    modifier_action: ModifierAction.ADD,
  },
];

describe('Orders Store - addToCart with modifiers', () => {
  beforeEach(() => {
    const store = useOrdersStore.getState();
    store.clearCart();
  });

  it('addToCart with modifiers creates new item (does not merge)', () => {
    const store = useOrdersStore.getState();

    // Add product without modifiers
    store.addToCart(mockProduct, undefined, 1);
    // Add same product with modifiers
    store.addToCart(mockProduct, undefined, 1, mockModifiers);

    const cart = useOrdersStore.getState().cart;
    expect(cart).toHaveLength(2);
    expect(cart[0].modifiers).toHaveLength(0);
    expect(cart[1].modifiers).toHaveLength(2);
  });

  it('addToCart with modifiers calculates correct total_price', () => {
    const store = useOrdersStore.getState();

    store.addToCart(mockProduct, undefined, 1, mockModifiers);

    const cart = useOrdersStore.getState().cart;
    expect(cart).toHaveLength(1);

    const item = cart[0];
    // unit_price = 24.99, modifiers_price = 3.5 + 5.0 = 8.5
    // total_price = 1 * (24.99 + 8.5) = 33.49
    expect(item.unit_price).toBe(24.99);
    expect(item.modifiers_price).toBe(8.5);
    expect(item.total_price).toBeCloseTo(33.49, 2);
  });

  it('addToCart without modifiers still merges existing items', () => {
    const store = useOrdersStore.getState();

    store.addToCart(mockProduct, undefined, 1);
    store.addToCart(mockProduct, undefined, 1);

    const cart = useOrdersStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('cart item modifiers_price is sum of modifier prices', () => {
    const store = useOrdersStore.getState();

    const mods: OrderItemModifier[] = [
      {
        modifier_id: 'mod-a',
        name: 'Mod A',
        price: 2.0,
        quantity: 1,
        modifier_action: ModifierAction.ADD,
      },
      {
        modifier_id: 'mod-b',
        name: 'Mod B',
        price: 3.0,
        quantity: 2,
        modifier_action: ModifierAction.ADD,
      },
    ];

    store.addToCart(mockProduct, undefined, 1, mods);

    const cart = useOrdersStore.getState().cart;
    // modifiers_price = 2.0 * 1 + 3.0 * 2 = 8.0
    expect(cart[0].modifiers_price).toBe(8.0);
  });

  it('addToCart with modifiers does not merge even with identical modifiers', () => {
    const store = useOrdersStore.getState();

    store.addToCart(mockProduct, undefined, 1, [mockModifiers[0]]);
    store.addToCart(mockProduct, undefined, 1, [mockModifiers[0]]);

    const cart = useOrdersStore.getState().cart;
    // Two separate items because both have modifiers
    expect(cart).toHaveLength(2);
  });
});
