import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { ProductCategory } from '@/types/enums';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'recipe-parent' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/layout/breadcrumb-context', () => ({
  useBreadcrumbLabel: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </header>
  ),
}));

vi.mock('@/modules/recipes/components/allergen-badges', () => ({
  AllergenBadges: ({ allergens }: { allergens: string[] }) => (
    <div>{allergens.length === 0 ? 'Brak alergenow' : allergens.join(', ')}</div>
  ),
}));

const mockFindById = vi.fn();
const mockGetRecipeVersions = vi.fn();
const mockCalculateRecipeCost = vi.fn();
const mockDeactivateRecipe = vi.fn();

vi.mock('@/modules/recipes/repository', () => ({
  recipesRepository: {
    recipes: {
      findById: (...args: unknown[]) => mockFindById(...args),
    },
    getRecipeVersions: (...args: unknown[]) => mockGetRecipeVersions(...args),
    calculateRecipeCost: (...args: unknown[]) => mockCalculateRecipeCost(...args),
    deactivateRecipe: (...args: unknown[]) => mockDeactivateRecipe(...args),
  },
}));

import RecipeDetailPage from '../page';

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindById.mockResolvedValue({
      id: 'recipe-parent',
      product_id: 'product-parent',
      name: 'KARAAGE FRYTY SPICY DANIE',
      description: null,
      product_category: ProductCategory.FINISHED_GOOD,
      ingredients: [
        {
          type: 'stock_item',
          reference_id: 'stock-fries',
          reference_name: 'FRYTKI EXPREES',
          quantity: 0.2,
          unit: 'kg',
        },
        {
          type: 'recipe',
          reference_id: 'recipe-kurczak',
          reference_name: 'KURCZAK KARAAGE SMAZONY',
          quantity: 0.18,
          unit: 'kg',
        },
        {
          type: 'recipe',
          reference_id: 'recipe-spicy-mayo',
          reference_name: 'SPICY MAYO',
          quantity: 0.04,
          unit: 'kg',
        },
      ],
      yield_quantity: 1,
      yield_unit: 'szt',
      preparation_time_minutes: 7,
      instructions: null,
      allergens: [],
      total_cost: 2.97,
      cost_per_unit: 2.97,
      food_cost_percentage: null,
      version: 1,
      is_active: true,
      created_by: 'system',
      last_updated_by: null,
      created_at: '2026-03-10T10:00:00.000Z',
      updated_at: '2026-03-10T10:00:00.000Z',
    });

    mockGetRecipeVersions.mockResolvedValue([]);
    mockCalculateRecipeCost.mockResolvedValue({
      recipe_id: 'recipe-parent',
      recipe_name: 'KARAAGE FRYTY SPICY DANIE',
      ingredients: [
        {
          type: 'stock_item',
          reference_id: 'stock-fries',
          reference_name: 'FRYTKI EXPREES',
          quantity: 0.2,
          unit: 'kg',
          cost_per_unit: 9.8,
          total_cost: 1.96,
          percentage_of_total: 65.99,
        },
        {
          type: 'recipe',
          reference_id: 'recipe-kurczak',
          reference_name: 'KURCZAK KARAAGE SMAZONY',
          quantity: 0.18,
          unit: 'kg',
          cost_per_unit: 4.4,
          total_cost: 0.79,
          percentage_of_total: 26.6,
        },
        {
          type: 'recipe',
          reference_id: 'recipe-spicy-mayo',
          reference_name: 'SPICY MAYO',
          quantity: 0.04,
          unit: 'kg',
          cost_per_unit: 5.5,
          total_cost: 0.22,
          percentage_of_total: 7.41,
        },
      ],
      total_cost: 2.97,
      yield_quantity: 1,
      cost_per_unit: 2.97,
      selling_price: null,
      food_cost_percentage: null,
      calculated_at: new Date('2026-03-10T10:00:00.000Z'),
    });
  });

  it('shows calculated sub-recipe costs and links ingredient names to related records', async () => {
    const { container } = render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('KARAAGE FRYTY SPICY DANIE')).toBeInTheDocument();
    });

    expect(mockCalculateRecipeCost).toHaveBeenCalledTimes(1);

    const kurczakRow = container.querySelector('[data-ingredient="recipe-kurczak"]');
    expect(kurczakRow).not.toBeNull();
    expect(within(kurczakRow as HTMLElement).getByText('0.79 zl')).toBeInTheDocument();

    const mayoRow = container.querySelector('[data-ingredient="recipe-spicy-mayo"]');
    expect(mayoRow).not.toBeNull();
    expect(within(mayoRow as HTMLElement).getByText('0.22 zl')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'FRYTKI EXPREES' })
    ).toHaveAttribute('href', '/inventory/stock-fries');
    expect(
      screen.getByRole('link', { name: 'KURCZAK KARAAGE SMAZONY' })
    ).toHaveAttribute('href', '/recipes/recipe-kurczak');
    expect(
      screen.getByRole('link', { name: 'SPICY MAYO' })
    ).toHaveAttribute('href', '/recipes/recipe-spicy-mayo');
  });
});
