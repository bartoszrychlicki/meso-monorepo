import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { useInventoryStore } from '@/modules/inventory/store';
import { ConsumptionType, ProductCategory, VatRate } from '@/types/enums';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'si-001' }),
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/layout/breadcrumb-context', () => ({
  useBreadcrumbLabel: vi.fn(),
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

vi.mock('@/components/shared/loading-skeleton', () => ({
  LoadingSkeleton: () => <div>Ladowanie...</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => <button type="button" data-value={value}>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
  } & ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({
    children,
    ...props
  }: {
    children: ReactNode;
  } & HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/inventory/components/description-tab', () => ({
  DescriptionTab: () => <div>Opis</div>,
}));

vi.mock('@/modules/inventory/components/options-tab', () => ({
  OptionsTab: () => <div>Opcje</div>,
}));

vi.mock('@/modules/inventory/components/components-tab', () => ({
  ComponentsTab: () => <div>Skladowe</div>,
}));

vi.mock('@/modules/inventory/components/usage-tab', () => ({
  UsageTab: () => <div>Uzycie</div>,
}));

vi.mock('@/modules/inventory/components/stock-item-warehouse-summary', () => ({
  StockItemWarehouseSummary: () => <div>Magazyny</div>,
}));

import StockItemDetailPage from '../page';

const makeStockItem = () => ({
  id: 'si-001',
  name: 'Test Item',
  sku: 'TEST-001',
  product_category: ProductCategory.RAW_MATERIAL,
  inventory_category_id: null,
  unit: 'g',
  cost_per_unit: 0.05,
  purchase_unit_weight_kg: null,
  allergens: [],
  is_active: true,
  vat_rate: VatRate.PTU_B,
  consumption_type: ConsumptionType.PRODUCT,
  shelf_life_days: 0,
  default_min_quantity: 0,
  storage_location: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('StockItemDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const item = makeStockItem();
    const loadStockItemDetail = vi.fn(async () => {
      useInventoryStore.setState({
        currentStockItem: item,
        detailLoadError: null,
      });
    });
    const loadInventoryCategories = vi.fn(async () => {
      useInventoryStore.setState({ inventoryCategories: [] });
    });
    const loadWarehouseAssignments = vi.fn(async () => {
      useInventoryStore.setState({ currentWarehouseAssignments: [] });
    });
    const loadComponents = vi.fn(async () => {
      useInventoryStore.setState({
        currentComponents: [],
        detailLoadError: 'Nie udalo sie zaladowac skladowych pozycji magazynowej. Sprobuj ponownie.',
      });
    });
    const loadUsage = vi.fn(async () => {
      useInventoryStore.setState({
        currentUsage: { in_components: [], in_recipes: [] },
      });
    });

    useInventoryStore.setState({
      stockItems: [],
      inventoryCategories: [],
      warehouses: [],
      warehouseStockItems: [],
      inventoryCounts: [],
      selectedWarehouseId: null,
      isLoading: false,
      loadError: null,
      currentStockItem: item,
      currentWarehouseAssignments: [],
      currentComponents: [],
      currentUsage: null,
      isDetailLoading: false,
      detailLoadError: null,
      currentInventoryCount: null,
      currentInventoryCountLines: [],
      isInventoryCountLoading: false,
      inventoryCountLoadError: null,
      loadStockItemDetail,
      loadWarehouseAssignments,
      loadInventoryCategories,
      loadComponents,
      loadUsage,
      updateStockItem: vi.fn(),
    });
  });

  it('shows partial-load warning when loaders resolve after updating store error state', async () => {
    render(<StockItemDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Niepelne dane szczegolow')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Nie udalo sie zaladowac skladowych pozycji magazynowej. Sprobuj ponownie.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Sprobuj ponownie')[0]).toBeInTheDocument();
  });

  it('keeps the initial view in loading state before detail data resolves', () => {
    const pending = new Promise<void>(() => {});

    useInventoryStore.setState({
      currentStockItem: null,
      currentWarehouseAssignments: [],
      currentComponents: [],
      currentUsage: null,
      isDetailLoading: false,
      detailLoadError: null,
      loadStockItemDetail: vi.fn(() => pending),
      loadWarehouseAssignments: vi.fn(() => pending),
      loadInventoryCategories: vi.fn(() => pending),
      loadComponents: vi.fn(() => pending),
      loadUsage: vi.fn(() => pending),
    });

    render(<StockItemDetailPage />);

    expect(screen.getByRole('heading', { name: 'Ladowanie...' })).toBeInTheDocument();
    expect(screen.queryByText('Nie udalo sie zaladowac pozycji')).not.toBeInTheDocument();
  });
});
