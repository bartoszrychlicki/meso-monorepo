import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ModifierPicker } from '../modifier-picker';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Recipe } from '@/types/recipe';

// Polyfill for Radix components (Dialog, Select, etc.)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock the ModifierFormDialog to avoid complex dialog rendering in unit tests
vi.mock('../modifier-form-dialog', () => ({
  ModifierFormDialog: ({
    open,
    onOpenChange,
    onSave,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: any) => Promise<void>;
    recipes: Recipe[];
  }) =>
    open ? (
      <div data-testid="modifier-form-dialog">
        <button
          onClick={() => {
            onSave({
              name: 'New Modifier',
              price: 2,
              modifier_action: 'add',
              recipe_id: null,
              is_available: true,
              sort_order: 0,
            });
          }}
        >
          Save Mock
        </button>
        <button onClick={() => onOpenChange(false)}>Close Mock</button>
      </div>
    ) : null,
}));

const mockRecipes: Recipe[] = [
  {
    id: 'recipe-1',
    product_id: 'product-1',
    name: 'Sos BBQ',
    description: null,
    product_category: 'semi_finished' as any,
    ingredients: [],
    yield_quantity: 1,
    yield_unit: 'szt',
    preparation_time_minutes: 10,
    instructions: null,
    allergens: [],
    total_cost: 2.0,
    cost_per_unit: 2.0,
    food_cost_percentage: null,
    version: 1,
    is_active: true,
    created_by: 'system',
    last_updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockModifiers: MenuModifier[] = [
  {
    id: 'mod-1',
    name: 'Extra Ser',
    price: 3.5,
    modifier_action: ModifierAction.ADD,
    recipe_id: 'recipe-1',
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
    name: 'Extra Bekon',
    price: 5.0,
    modifier_action: ModifierAction.ADD,
    recipe_id: null,
    is_available: true,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('ModifierPicker', () => {
  const mockOnChange = vi.fn();
  const mockOnCreateModifier = vi.fn().mockResolvedValue({
    id: 'new-mod',
    name: 'New Modifier',
    price: 2,
    modifier_action: ModifierAction.ADD,
    recipe_id: null,
    is_available: true,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all modifiers with checkboxes', () => {
    render(
      <ModifierPicker
        allModifiers={mockModifiers}
        selectedModifierIds={[]}
        onChange={mockOnChange}
        recipes={mockRecipes}
        onCreateModifier={mockOnCreateModifier}
      />
    );

    expect(screen.getByText('Extra Ser')).toBeInTheDocument();
    expect(screen.getByText('Bez Cebuli')).toBeInTheDocument();
    expect(screen.getByText('Extra Bekon')).toBeInTheDocument();

    // Should have checkboxes (Radix Checkbox renders role=checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('pre-selects modifiers from selectedModifierIds', () => {
    render(
      <ModifierPicker
        allModifiers={mockModifiers}
        selectedModifierIds={['mod-1', 'mod-3']}
        onChange={mockOnChange}
        recipes={mockRecipes}
        onCreateModifier={mockOnCreateModifier}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // mod-1 (Extra Ser) and mod-3 (Extra Bekon) should be checked
    expect(checkboxes[0]).toHaveAttribute('data-state', 'checked');
    expect(checkboxes[1]).toHaveAttribute('data-state', 'unchecked');
    expect(checkboxes[2]).toHaveAttribute('data-state', 'checked');
  });

  it('search filters modifiers by name', async () => {
    render(
      <ModifierPicker
        allModifiers={mockModifiers}
        selectedModifierIds={[]}
        onChange={mockOnChange}
        recipes={mockRecipes}
        onCreateModifier={mockOnCreateModifier}
      />
    );

    const searchInput = screen.getByPlaceholderText(/szukaj/i);
    fireEvent.change(searchInput, { target: { value: 'Bekon' } });

    await waitFor(() => {
      expect(screen.getByText('Extra Bekon')).toBeInTheDocument();
      expect(screen.queryByText('Extra Ser')).not.toBeInTheDocument();
      expect(screen.queryByText('Bez Cebuli')).not.toBeInTheDocument();
    });
  });

  it('toggle calls onChange with updated IDs', () => {
    render(
      <ModifierPicker
        allModifiers={mockModifiers}
        selectedModifierIds={['mod-1']}
        onChange={mockOnChange}
        recipes={mockRecipes}
        onCreateModifier={mockOnCreateModifier}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Uncheck mod-1 (currently selected)
    fireEvent.click(checkboxes[0]);
    expect(mockOnChange).toHaveBeenCalledWith([]);

    mockOnChange.mockClear();

    // Check mod-2 (not currently selected)
    fireEvent.click(checkboxes[1]);
    expect(mockOnChange).toHaveBeenCalledWith(['mod-1', 'mod-2']);
  });

  it('shows "Stworz nowy modyfikator" button', () => {
    render(
      <ModifierPicker
        allModifiers={mockModifiers}
        selectedModifierIds={[]}
        onChange={mockOnChange}
        recipes={mockRecipes}
        onCreateModifier={mockOnCreateModifier}
      />
    );

    expect(
      screen.getByRole('button', { name: /stworz nowy modyfikator/i })
    ).toBeInTheDocument();
  });
});
