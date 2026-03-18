import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { MenuGrid } from '../menu-grid';

vi.mock('../product-card', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <div>{product.name}</div>,
}));

vi.mock('../product-reorder-list', () => ({
  ProductReorderList: ({
    products,
    onReorder,
    onClose,
  }: {
    products: Array<{ id: string }>;
    onReorder: (productIds: string[]) => Promise<void>;
    onClose: () => void;
  }) => (
    <div data-testid="product-reorder-list">
      <button type="button" onClick={() => void onReorder(products.map((product) => product.id).reverse())}>
        Save reorder
      </button>
      <button type="button" onClick={onClose}>
        Close reorder
      </button>
    </div>
  ),
}));

const categories = [
  {
    id: 'cat-1',
    name: 'Ramen',
    slug: 'ramen',
    sort_order: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

const products = [
  {
    id: 'prod-1',
    name: 'Miso',
    slug: 'miso',
    category_id: 'cat-1',
    type: 'single',
    price: 32,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    variants: [],
    modifier_groups: [],
    ingredients: [],
    sort_order: 0,
    sku: 'MIS-1',
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Shoyu',
    slug: 'shoyu',
    category_id: 'cat-1',
    type: 'single',
    price: 33,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    variants: [],
    modifier_groups: [],
    ingredients: [],
    sort_order: 1,
    sku: 'SHO-1',
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

describe('MenuGrid', () => {
  it('enables reorder mode only for a selected category without search', () => {
    render(
      <MenuGrid
        products={products as never}
        categories={categories as never}
        stockItems={[]}
        recipes={[]}
        selectedCategoryId={null}
        searchQuery=""
        onSearchChange={vi.fn()}
        onToggleAvailability={vi.fn()}
        onReorderProducts={vi.fn().mockResolvedValue(undefined)}
        onProductClick={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Uloz kolejnosc' })).toBeDisabled();
    expect(screen.getByText('Wybierz konkretna kategorie, aby ulozyc kolejnosc produktow.')).toBeInTheDocument();
  });

  it('calls reorder callback with the current category when reorder list saves', async () => {
    const onReorderProducts = vi.fn().mockResolvedValue(undefined);

    render(
      <MenuGrid
        products={products as never}
        categories={categories as never}
        stockItems={[]}
        recipes={[]}
        selectedCategoryId="cat-1"
        searchQuery=""
        onSearchChange={vi.fn()}
        onToggleAvailability={vi.fn()}
        onReorderProducts={onReorderProducts}
        onProductClick={vi.fn()}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Uloz kolejnosc' }));
    expect(screen.getByTestId('product-reorder-list')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save reorder' }));
    });

    expect(onReorderProducts).toHaveBeenCalledWith('cat-1', ['prod-2', 'prod-1']);
  });
});
