import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OrderEditForm } from '../order-edit-form';
import { ModifierAction, OrderChannel, OrderSource, OrderStatus, PaymentMethod, PaymentStatus, ProductType } from '@/types/enums';
import type { Order } from '@/types/order';

const { mockProductsFindAll, mockCategoriesFindAll, mockGetProductModifiers } = vi.hoisted(() => ({
  mockProductsFindAll: vi.fn(),
  mockCategoriesFindAll: vi.fn(),
  mockGetProductModifiers: vi.fn(),
}));

vi.mock('@/modules/menu/repository', () => ({
  productsRepository: {
    findAll: mockProductsFindAll,
  },
  categoriesRepository: {
    findAll: mockCategoriesFindAll,
  },
  getProductModifiers: mockGetProductModifiers,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const baseOrder: Order = {
  id: 'order-1',
  order_number: 'ZAM-001',
  status: OrderStatus.PREPARING,
  channel: OrderChannel.POS,
  source: OrderSource.TAKEAWAY,
  location_id: 'loc-1',
  customer_name: 'Anna',
  customer_phone: '+48 500 100 200',
  items: [
    {
      id: 'item-1',
      product_id: 'prod-1',
      product_name: 'Ramen',
      quantity: 1,
      unit_price: 32,
      subtotal: 32,
      modifiers: [
        {
          modifier_id: 'mod-1',
          name: 'Extra Chashu',
          price: 8,
          quantity: 1,
          modifier_action: ModifierAction.ADD,
        },
      ],
    },
  ],
  subtotal: 32,
  tax: 2.37,
  discount: 0,
  total: 32,
  payment_method: PaymentMethod.CARD,
  payment_status: PaymentStatus.PENDING,
  notes: 'Bez cebuli',
  status_history: [],
  created_at: '2026-03-15T10:00:00.000Z',
  updated_at: '2026-03-15T10:00:00.000Z',
};

const catalogProducts = [
  {
    id: 'prod-1',
    name: 'Ramen',
    slug: 'ramen',
    category_id: 'cat-1',
    type: ProductType.SINGLE,
    price: 32,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    variants: [],
    modifier_groups: [],
    ingredients: [],
    sort_order: 1,
    sku: 'RAM-1',
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
  },
  {
    id: 'prod-2',
    name: 'Gyoza',
    slug: 'gyoza',
    category_id: 'cat-1',
    type: ProductType.SINGLE,
    price: 18,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    variants: [],
    modifier_groups: [],
    ingredients: [],
    sort_order: 2,
    sku: 'GYO-1',
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
  },
];

describe('OrderEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProductsFindAll.mockResolvedValue({
      data: catalogProducts,
    });
    mockCategoriesFindAll.mockResolvedValue({
      data: [
        {
          id: 'cat-1',
          name: 'Ramen',
          slug: 'ramen',
          sort_order: 1,
          is_active: true,
        },
      ],
    });
    mockGetProductModifiers.mockResolvedValue([]);
  });

  it('allows editing phone and note, changing quantity, removing modifiers and adding a new dish', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<OrderEditForm order={baseOrder} onSave={onSave} />);

    await screen.findByText('Gyoza');

    fireEvent.change(screen.getByLabelText('Telefon klienta'), {
      target: { value: '+48 500 222 333' },
    });
    fireEvent.change(screen.getByLabelText('Notatka do zamówienia'), {
      target: { value: 'Dorzucic sztucce' },
    });

    const increaseQuantityButton = document.querySelector(
      '[data-action="increase-item-quantity"][data-id="item-1"]'
    ) as HTMLButtonElement | null;
    expect(increaseQuantityButton).not.toBeNull();
    fireEvent.click(increaseQuantityButton!);

    const removeModifierButton = document.querySelector(
      '[data-action="remove-item-modifier"]'
    ) as HTMLButtonElement | null;
    expect(removeModifierButton).not.toBeNull();
    fireEvent.click(removeModifierButton!);

    fireEvent.click(screen.getByRole('button', { name: /Gyoza/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Gyoza').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Zapisz zmiany/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_phone: '+48 500 222 333',
          notes: 'Dorzucic sztucce',
          items: [
            expect.objectContaining({
              id: 'item-1',
              quantity: 2,
              modifiers: [],
            }),
            expect.objectContaining({
              product_id: 'prod-2',
              product_name: 'Gyoza',
            }),
          ],
        })
      );
    });
  });

  it('allows removing a dish before saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const orderWithTwoItems: Order = {
      ...baseOrder,
      items: [
        ...baseOrder.items,
        {
          id: 'item-2',
          product_id: 'prod-2',
          product_name: 'Gyoza',
          quantity: 1,
          unit_price: 18,
          subtotal: 18,
          modifiers: [],
        },
      ],
      subtotal: 50,
      total: 50,
    };

    render(<OrderEditForm order={orderWithTwoItems} onSave={onSave} />);

    const removeButton = document.querySelector(
      '[data-action="remove-order-item"][data-id="item-1"]'
    ) as HTMLButtonElement | null;
    expect(removeButton).not.toBeNull();
    fireEvent.click(removeButton!);
    fireEvent.click(screen.getByRole('button', { name: /Zapisz zmiany/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              id: 'item-2',
              product_name: 'Gyoza',
            }),
          ],
        })
      );
    });
  });

  it('blocks saving when a paid online order changes total amount', async () => {
    render(
      <OrderEditForm
        order={{
          ...baseOrder,
          payment_method: PaymentMethod.ONLINE,
          payment_status: PaymentStatus.PAID,
        }}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /Gyoza/i }));

    expect(
      await screen.findByText(/Zapis jest zablokowany, bo ta edycja zmienia wartość opłaconego zamówienia/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zapisz zmiany/i })).toBeDisabled();
  });

  it('does not send items when only non-item fields changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<OrderEditForm order={baseOrder} onSave={onSave} />);

    await screen.findByText('Gyoza');

    fireEvent.change(screen.getByLabelText('Telefon klienta'), {
      target: { value: '+48 500 222 333' },
    });
    fireEvent.change(screen.getByLabelText('Notatka do zamówienia'), {
      target: { value: 'Dorzucic sztucce' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Zapisz zmiany/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        customer_phone: '+48 500 222 333',
        notes: 'Dorzucic sztucce',
      });
    });
  });
});
