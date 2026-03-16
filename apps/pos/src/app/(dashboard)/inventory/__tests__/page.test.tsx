import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { ConsumptionType, ProductCategory, VatRate } from '@/types/enums';
import type { InventoryCount, StockItem, WarehouseStockItem } from '@/types/inventory';
import { useInventoryStore } from '@/modules/inventory/store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
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

vi.mock('@/components/dashboard/kpi-card', () => ({
  KpiCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>{label}:{value}</div>
  ),
}));

vi.mock('@/components/shared/loading-skeleton', () => ({
  LoadingSkeleton: () => <div>Ladowanie...</div>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/inventory/components/stock-table', () => ({
  StockTable: ({ items }: { items: Array<{ name: string }> }) => <div>StockTable:{items.length}</div>,
}));

vi.mock('@/modules/inventory/components/stock-item-form', () => ({
  StockItemForm: () => <div>StockItemForm</div>,
}));

vi.mock('@/modules/inventory/components/transfer-dialog', () => ({
  TransferDialog: () => <div>TransferDialog</div>,
}));

vi.mock('@/modules/inventory/components/warehouse-manager', () => ({
  WarehouseManager: () => <div>WarehouseManager</div>,
}));

vi.mock('@/modules/inventory/components/inventory-category-manager', () => ({
  InventoryCategoryManager: () => <div>InventoryCategoryManager</div>,
}));

vi.mock('@/modules/inventory/components/inventory-count-create-dialog', () => ({
  InventoryCountCreateDialog: () => <div>InventoryCountCreateDialog</div>,
}));

vi.mock('@/modules/inventory/components/inventory-counts-table', () => ({
  InventoryCountsTable: ({ counts }: { counts: Array<{ number: string }> }) => (
    <div>InventoryCountsTable:{counts.map((count) => count.number).join(',')}</div>
  ),
}));

import InventoryPage from '../page';

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const stockItem: StockItem = {
      id: 'si-001',
      name: 'Wolowina mielona',
      sku: 'RAW-BEEF-001',
      product_category: ProductCategory.RAW_MATERIAL,
      inventory_category_id: null,
      unit: 'kg',
      cost_per_unit: 12,
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
    };

    const warehouseStockItem: WarehouseStockItem = {
      ...stockItem,
      storage_location: 'Regal A',
      warehouse_id: 'wh-001',
      warehouse_name: 'Magazyn glowny',
      quantity: 12,
      min_quantity: 5,
      warehouse_stock_id: 'ws-001',
    };

    const inventoryCount: InventoryCount = {
      id: 'count-001',
      number: 'INW 1/2026',
      scope: 'single',
      warehouse_id: 'wh-001',
      status: 'draft',
      comment: null,
      created_by: null,
      approved_at: null,
      created_at: '2026-03-16T10:00:00Z',
      updated_at: '2026-03-16T10:00:00Z',
      warehouse_name: 'Magazyn glowny',
      total_lines: 1,
      counted_lines: 0,
      difference_lines: 0,
    };

    useInventoryStore.setState({
      stockItems: [stockItem],
      inventoryCategories: [],
      warehouses: [
        {
          id: 'wh-001',
          name: 'Magazyn glowny',
          location_id: null,
          is_active: true,
          is_default: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      warehouseStockItems: [warehouseStockItem],
      inventoryCounts: [inventoryCount],
      selectedWarehouseId: null,
      isLoading: false,
      loadError: null,
      loadAll: vi.fn(async () => undefined),
      adjustStock: vi.fn(async () => undefined),
      createStockItem: vi.fn(async () => stockItem),
      deleteStockItem: vi.fn(async () => undefined),
      assignToWarehouse: vi.fn(async () => undefined),
      transferStock: vi.fn(async () => undefined),
      createWarehouse: vi.fn(async () => undefined),
      updateWarehouse: vi.fn(async () => undefined),
      deleteWarehouse: vi.fn(async () => undefined),
      setDefaultWarehouse: vi.fn(async () => undefined),
      createInventoryCategory: vi.fn(async () => undefined),
      updateInventoryCategory: vi.fn(async () => undefined),
      deleteInventoryCategory: vi.fn(async () => undefined),
      createInventoryCount: vi.fn(async () => inventoryCount),
      setSelectedWarehouse: vi.fn(),
    });
  });

  it('renders stock and inventory count views inside magazyn module', () => {
    render(<InventoryPage />);

    expect(screen.getByRole('heading', { name: 'Magazyn' })).toBeInTheDocument();
    expect(screen.getByText('Stany')).toBeInTheDocument();
    expect(screen.getByText('Inwentaryzacje')).toBeInTheDocument();
    expect(screen.getByText('Nowa inwentaryzacja')).toBeInTheDocument();
    expect(screen.getAllByText('StockTable:1')).toHaveLength(2);
    expect(screen.getByText('InventoryCountsTable:INW 1/2026')).toBeInTheDocument();
  });
});
