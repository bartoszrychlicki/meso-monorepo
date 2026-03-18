import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProductReorderList } from '../product-reorder-list';

vi.mock('@dnd-kit/core', () => ({
  closestCenter: {},
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: (event: { active: { id: string }; over: { id: string } }) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onDragEnd({ active: { id: 'prod-2' }, over: { id: 'prod-1' } })}
      >
        Simulate reorder
      </button>
      {children}
    </div>
  ),
  KeyboardSensor: function KeyboardSensor() {},
  MouseSensor: function MouseSensor() {},
  TouchSensor: function TouchSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  arrayMove: <T,>(items: T[], oldIndex: number, newIndex: number) => {
    const nextItems = [...items];
    const [movedItem] = nextItems.splice(oldIndex, 1);
    nextItems.splice(newIndex, 0, movedItem);
    return nextItems;
  },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

function makeProduct(id: string, name: string, sortOrder: number) {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    category_id: 'cat-1',
    type: 'single',
    price: 10,
    images: [],
    is_available: true,
    is_featured: false,
    allergens: [],
    variants: [],
    modifier_groups: [],
    ingredients: [],
    sort_order: sortOrder,
    sku: `${id}-sku`,
    tax_rate: 8,
    is_active: true,
    point_ids: [],
    pricing: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function getRenderedOrder(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('[data-component="product-reorder-row"] h3')
  ).map((node) => node.textContent);
}

describe('ProductReorderList', () => {
  it('keeps the local order while save state triggers a parent rerender', async () => {
    const onReorder = vi.fn().mockImplementation(
      () => new Promise<void>(() => {})
    );
    const products = [
      makeProduct('prod-1', 'Miso', 0),
      makeProduct('prod-2', 'Shoyu', 1),
    ];

    const { container, rerender } = render(
      <ProductReorderList
        products={products as never}
        isSaving={false}
        onReorder={onReorder}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Simulate reorder' }));

    expect(getRenderedOrder(container)).toEqual(['Shoyu', 'Miso']);

    rerender(
      <ProductReorderList
        products={products as never}
        isSaving
        onReorder={onReorder}
        onClose={vi.fn()}
      />
    );

    expect(getRenderedOrder(container)).toEqual(['Shoyu', 'Miso']);
  });

  it('falls back to incoming products when the product set changes mid-save', async () => {
    const onReorder = vi.fn().mockImplementation(
      () => new Promise<void>(() => {})
    );
    const products = [
      makeProduct('prod-1', 'Miso', 0),
      makeProduct('prod-2', 'Shoyu', 1),
    ];
    const nextCategoryProducts = [
      makeProduct('prod-3', 'Tantan', 0),
      makeProduct('prod-4', 'Udon', 1),
    ];

    const { container, rerender } = render(
      <ProductReorderList
        products={products as never}
        isSaving={false}
        onReorder={onReorder}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Simulate reorder' }));

    rerender(
      <ProductReorderList
        products={nextCategoryProducts as never}
        isSaving
        onReorder={onReorder}
        onClose={vi.fn()}
      />
    );

    expect(getRenderedOrder(container)).toEqual(['Tantan', 'Udon']);
  });
});
