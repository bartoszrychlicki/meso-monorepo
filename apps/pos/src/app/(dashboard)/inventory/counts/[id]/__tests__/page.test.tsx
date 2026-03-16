import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { useInventoryStore } from '@/modules/inventory/store';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'count-001' }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
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

vi.mock('@/components/shared/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
  } & ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: HTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: HTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? 'SelectValue'}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/inventory/components/inventory-count-status-badge', () => ({
  InventoryCountStatusBadge: ({ status }: { status: string }) => <div>Status:{status}</div>,
}));

vi.mock('@/modules/inventory/components/inventory-count-item-picker-dialog', () => ({
  InventoryCountItemPickerDialog: () => <div>Picker</div>,
}));

vi.mock('@/modules/inventory/components/inventory-count-line-row', () => ({
  InventoryCountLineRow: ({ line }: { line: { stock_item_name: string } }) => (
    <tr><td>{line.stock_item_name}</td></tr>
  ),
}));

import InventoryCountDetailPage from '../page';

describe('InventoryCountDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useInventoryStore.setState({
      stockItems: [],
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
      warehouseStockItems: [],
      inventoryCounts: [],
      selectedWarehouseId: 'wh-001',
      isLoading: false,
      loadError: null,
      currentStockItem: null,
      currentWarehouseAssignments: [],
      currentComponents: [],
      currentUsage: null,
      isDetailLoading: false,
      detailLoadError: null,
      currentInventoryCount: {
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
      },
      currentInventoryCountLines: [
        {
          id: 'line-001',
          inventory_count_id: 'count-001',
          warehouse_id: 'wh-001',
          stock_item_id: 'si-001',
          stock_item_name: 'Wolowina mielona',
          stock_item_sku: 'RAW-BEEF-001',
          stock_item_unit: 'kg',
          expected_quantity: 12,
          counted_quantity: null,
          note: null,
          edited_inventory_category_id: null,
          edited_storage_location: 'Regal A',
          sort_order: 0,
          created_at: '2026-03-16T10:00:00Z',
          updated_at: '2026-03-16T10:00:00Z',
          warehouse_name: 'Magazyn glowny',
        },
      ],
      isInventoryCountLoading: false,
      inventoryCountLoadError: null,
      loadAll: vi.fn(async () => undefined),
      loadInventoryCountDetail: vi.fn(async () => undefined),
      updateInventoryCountComment: vi.fn(async () => undefined),
      updateInventoryCountLine: vi.fn(async () => undefined),
      addStockItemToInventoryCount: vi.fn(async () => undefined),
      approveInventoryCount: vi.fn(async () => undefined),
      cancelInventoryCount: vi.fn(async () => undefined),
    });
  });

  it('renders draft inventory count and blocks approval when lines are uncounted', async () => {
    render(<InventoryCountDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'INW 1/2026' })).toBeInTheDocument();
    });

    expect(screen.getByText('Zakres: Magazyn glowny')).toBeInTheDocument();
    expect(screen.getByText('Status:draft')).toBeInTheDocument();
    expect(screen.getByText('Wolowina mielona')).toBeInTheDocument();
    expect(screen.getByText('Wiecej')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zatwierdz' })).toBeDisabled();
  });

  it('shows error state when count cannot be loaded', async () => {
    useInventoryStore.setState({
      currentInventoryCount: null,
      currentInventoryCountLines: [],
      inventoryCountLoadError: 'Nie znaleziono inwentaryzacji.',
      loadAll: vi.fn(async () => undefined),
      loadInventoryCountDetail: vi.fn(async () => undefined),
    });

    render(<InventoryCountDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nie udalo sie zaladowac inwentaryzacji' })).toBeInTheDocument();
    });

    expect(screen.getByText('Nie znaleziono inwentaryzacji.')).toBeInTheDocument();
    expect(screen.getByText('Powrot do magazynu')).toBeInTheDocument();
  });
});
