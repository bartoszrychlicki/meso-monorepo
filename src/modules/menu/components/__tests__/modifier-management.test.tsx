import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ModifierManagement } from '../modifier-management';
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
    is_available: false,
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

describe('ModifierManagement', () => {
  const mockCreateModifier = vi.fn().mockResolvedValue({ id: 'new-mod' });
  const mockUpdateModifier = vi.fn().mockResolvedValue(undefined);
  const mockDeleteModifier = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of modifiers in table', () => {
    render(
      <ModifierManagement
        modifiers={mockModifiers}
        recipes={mockRecipes}
        isLoading={false}
        onCreateModifier={mockCreateModifier}
        onUpdateModifier={mockUpdateModifier}
        onDeleteModifier={mockDeleteModifier}
      />
    );

    // All modifier names should be in the document
    expect(screen.getByText('Extra Ser')).toBeInTheDocument();
    expect(screen.getByText('Bez Cebuli')).toBeInTheDocument();
    expect(screen.getByText('Extra Bekon')).toBeInTheDocument();
  });

  it('search filters modifiers by name', async () => {
    render(
      <ModifierManagement
        modifiers={mockModifiers}
        recipes={mockRecipes}
        isLoading={false}
        onCreateModifier={mockCreateModifier}
        onUpdateModifier={mockUpdateModifier}
        onDeleteModifier={mockDeleteModifier}
      />
    );

    const searchInput = screen.getByPlaceholderText(/szukaj/i);
    fireEvent.change(searchInput, { target: { value: 'Bekon' } });

    // Only "Extra Bekon" should remain visible
    await waitFor(() => {
      expect(screen.getByText('Extra Bekon')).toBeInTheDocument();
      expect(screen.queryByText('Extra Ser')).not.toBeInTheDocument();
      expect(screen.queryByText('Bez Cebuli')).not.toBeInTheDocument();
    });
  });

  it('shows "Nowy modyfikator" button', () => {
    render(
      <ModifierManagement
        modifiers={mockModifiers}
        recipes={mockRecipes}
        isLoading={false}
        onCreateModifier={mockCreateModifier}
        onUpdateModifier={mockUpdateModifier}
        onDeleteModifier={mockDeleteModifier}
      />
    );

    expect(
      screen.getByRole('button', { name: /nowy modyfikator/i })
    ).toBeInTheDocument();
  });

  it('opens form dialog when "Nowy modyfikator" clicked', async () => {
    render(
      <ModifierManagement
        modifiers={mockModifiers}
        recipes={mockRecipes}
        isLoading={false}
        onCreateModifier={mockCreateModifier}
        onUpdateModifier={mockUpdateModifier}
        onDeleteModifier={mockDeleteModifier}
      />
    );

    const createButton = screen.getByRole('button', { name: /nowy modyfikator/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      // The dialog should open and render the form dialog component
      expect(
        document.querySelector('[data-component="modifier-form-dialog"]')
      ).toBeInTheDocument();
      // The dialog title should be visible as a heading
      expect(screen.getByRole('heading', { name: /nowy modyfikator/i })).toBeInTheDocument();
    });
  });

  it('shows empty state when no modifiers', () => {
    render(
      <ModifierManagement
        modifiers={[]}
        recipes={mockRecipes}
        isLoading={false}
        onCreateModifier={mockCreateModifier}
        onUpdateModifier={mockUpdateModifier}
        onDeleteModifier={mockDeleteModifier}
      />
    );

    expect(screen.getByText(/brak modyfikator/i)).toBeInTheDocument();
  });

  it('shows loading state when isLoading', () => {
    render(
      <ModifierManagement
        modifiers={[]}
        recipes={mockRecipes}
        isLoading={true}
        onCreateModifier={mockCreateModifier}
        onUpdateModifier={mockUpdateModifier}
        onDeleteModifier={mockDeleteModifier}
      />
    );

    expect(
      document.querySelector('[data-component="loading-skeleton"]')
    ).toBeInTheDocument();
  });
});
