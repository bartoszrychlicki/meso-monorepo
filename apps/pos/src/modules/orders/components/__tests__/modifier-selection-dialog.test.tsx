import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ModifierSelectionDialog } from '../modifier-selection-dialog';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Product } from '@/types/menu';

// Polyfill for Radix components (Dialog, Checkbox, etc.)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Cheeseburger Klasyczny',
  slug: 'cheeseburger-klasyczny',
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

const mockModifiers: MenuModifier[] = [
  {
    id: 'mod-1',
    name: 'Extra Ser',
    price: 3.5,
    modifier_action: ModifierAction.ADD,
    recipe_id: null,
    is_available: true,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mod-2',
    name: 'Bez Cebuli',
    price: 0,
    modifier_action: ModifierAction.REMOVE,
    recipe_id: null,
    is_available: true,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mod-3',
    name: 'Dodatkowy Bekon',
    price: 5.0,
    modifier_action: ModifierAction.ADD,
    recipe_id: null,
    is_available: true,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('ModifierSelectionDialog', () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onOpenChange = vi.fn();
  });

  function renderDialog(props?: Partial<React.ComponentProps<typeof ModifierSelectionDialog>>) {
    return render(
      <ModifierSelectionDialog
        open={true}
        onOpenChange={onOpenChange}
        product={mockProduct}
        modifiers={mockModifiers}
        onConfirm={onConfirm}
        {...props}
      />
    );
  }

  it('renders modifier list with checkboxes', () => {
    renderDialog();

    expect(screen.getByText('Extra Ser')).toBeInTheDocument();
    expect(screen.getByText('Bez Cebuli')).toBeInTheDocument();
    expect(screen.getByText('Dodatkowy Bekon')).toBeInTheDocument();

    // Should have checkboxes (role=checkbox from Radix)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('shows product name as title', () => {
    renderDialog();
    expect(screen.getByText('Cheeseburger Klasyczny')).toBeInTheDocument();
  });

  it('toggling checkbox selects/deselects modifier', () => {
    renderDialog();

    const checkboxes = screen.getAllByRole('checkbox');
    // Initially unchecked
    expect(checkboxes[0]).not.toBeChecked();

    // Click to check
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // Click again to uncheck
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('"Dodaj do zamowienia" calls onConfirm with selected modifiers', () => {
    renderDialog();

    // Select first and third modifiers
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Extra Ser
    fireEvent.click(checkboxes[2]); // Dodatkowy Bekon

    // Click "Dodaj do zamowienia"
    const confirmBtn = screen.getByText('Dodaj do zamowienia');
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const selectedMods = onConfirm.mock.calls[0][0];
    expect(selectedMods).toHaveLength(2);
    expect(selectedMods[0]).toEqual({
      modifier_id: 'mod-1',
      name: 'Extra Ser',
      price: 3.5,
      quantity: 1,
      modifier_action: ModifierAction.ADD,
    });
    expect(selectedMods[1]).toEqual({
      modifier_id: 'mod-3',
      name: 'Dodatkowy Bekon',
      price: 5.0,
      quantity: 1,
      modifier_action: ModifierAction.ADD,
    });
  });

  it('"Bez modyfikatorow" calls onConfirm with empty array', () => {
    renderDialog();

    const skipBtn = screen.getByText('Bez modyfikatorow');
    fireEvent.click(skipBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith([]);
  });

  it('resets selections when dialog reopens', () => {
    const { rerender } = render(
      <ModifierSelectionDialog
        open={true}
        onOpenChange={onOpenChange}
        product={mockProduct}
        modifiers={mockModifiers}
        onConfirm={onConfirm}
      />
    );

    // Select a modifier
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // Close dialog
    rerender(
      <ModifierSelectionDialog
        open={false}
        onOpenChange={onOpenChange}
        product={mockProduct}
        modifiers={mockModifiers}
        onConfirm={onConfirm}
      />
    );

    // Reopen dialog
    rerender(
      <ModifierSelectionDialog
        open={true}
        onOpenChange={onOpenChange}
        product={mockProduct}
        modifiers={mockModifiers}
        onConfirm={onConfirm}
      />
    );

    // Should be unchecked again
    const newCheckboxes = screen.getAllByRole('checkbox');
    newCheckboxes.forEach((cb) => {
      expect(cb).not.toBeChecked();
    });
  });
});
