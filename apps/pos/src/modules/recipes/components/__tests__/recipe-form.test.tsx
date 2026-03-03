import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProductCategory } from '@/types/enums';

// Polyfill for Radix components
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Valid v4 UUIDs (hardcoded, generated once)
const STOCK_ID_1 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const _STOCK_ID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

// Mock inventory repository
vi.mock('@/modules/inventory/repository', () => ({
  inventoryRepository: {
    getAllStockItems: vi.fn().mockResolvedValue([
      {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        name: 'Boczek wieprzowy',
        unit: 'kg',
        cost_per_unit: 25.0,
        allergens: [],
      },
      {
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        name: 'Jajka',
        unit: 'szt',
        cost_per_unit: 1.2,
        allergens: [],
      },
    ]),
    getAllWarehouses: vi.fn().mockResolvedValue([
      {
        id: 'warehouse-1',
        name: 'Magazyn glowny',
        is_active: true,
      },
    ]),
  },
}));

// Mock recipes repository
vi.mock('@/modules/recipes/repository', () => ({
  recipesRepository: {
    getRecipesByCategory: vi.fn().mockResolvedValue([]),
  },
}));

// Mock sonner toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

import { RecipeForm } from '../recipe-form';

describe('RecipeForm', () => {
  const mockSubmit = vi.fn().mockResolvedValue(undefined);
  const mockCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits successfully with valid data and ingredients', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Wait for stock items to load
    await waitFor(() => {
      expect(screen.getByText('Boczek wieprzowy')).toBeInTheDocument();
    });

    // Fill in the name (must be >= 3 chars)
    const nameInput = screen.getByPlaceholderText('np. Cheeseburger Classic');
    fireEvent.change(nameInput, { target: { value: 'Test Recipe Name' } });

    // Select an ingredient by clicking on it
    await act(async () => {
      fireEvent.click(screen.getByText('Boczek wieprzowy'));
    });

    // Verify ingredient was added
    await waitFor(() => {
      expect(screen.getByText('Wybrane (1)')).toBeInTheDocument();
    });

    // Click save
    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /zapisz recepture/i });
      fireEvent.click(saveButton);
    });

    // onSubmit should be called — no validation errors
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });

    expect(mockToastError).not.toHaveBeenCalled();

    // Verify submitted data shape
    const submittedData = mockSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe('Test Recipe Name');
    expect(submittedData.ingredients.length).toBe(1);
    expect(submittedData.ingredients[0].type).toBe('stock_item');
    expect(submittedData.ingredients[0].reference_id).toBe(STOCK_ID_1);
    expect(submittedData.ingredients[0].quantity).toBe(1);
  });

  it('shows toast error when submitting without required fields', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Wait for stock items to load
    await waitFor(() => {
      expect(screen.getByText('Boczek wieprzowy')).toBeInTheDocument();
    });

    // Don't fill anything — just click save immediately
    const saveButton = screen.getByRole('button', { name: /zapisz recepture/i });
    fireEvent.click(saveButton);

    // Toast error should be called (validation fails on name + ingredients)
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits recipe edit with non-UUID metadata values', async () => {
    render(
      <RecipeForm
        defaultValues={{
          name: 'Azjatycki Coleslaw',
          description: 'Surowka coleslaw z pasta miso',
          product_id: 'product-coleslaw',
          created_by: 'system',
          product_category: ProductCategory.FINISHED_GOOD,
          ingredients: [
            {
              type: 'stock_item',
              reference_id: STOCK_ID_1,
              reference_name: 'Boczek wieprzowy',
              quantity: 1,
              unit: 'kg',
            },
          ],
          yield_quantity: 1,
          yield_unit: 'porcja',
          preparation_time_minutes: 10,
        }}
        onSubmit={mockSubmit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Wybrane (1)')).toBeInTheDocument();
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /zapisz recepture/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = mockSubmit.mock.calls[0][0];
    expect(submittedData.product_id).toBe('product-coleslaw');
    expect(submittedData.created_by).toBe('system');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('opens stock item dialog from recipe ingredients section', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Boczek wieprzowy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /dodaj produkt/i }));

    await waitFor(() => {
      expect(screen.getByText('Nowa pozycja magazynowa')).toBeInTheDocument();
    });
  });
});
