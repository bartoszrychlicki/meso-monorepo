import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConsumptionType, ProductCategory, VatRate } from '@/types/enums';
import type { WarehouseStockItem } from '@/types/inventory';
import { StockTable } from '../stock-table';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const item: WarehouseStockItem = {
  id: 'item-001',
  name: 'Limonka',
  sku: 'RAW-VEG-009',
  product_category: ProductCategory.RAW_MATERIAL,
  inventory_category_id: null,
  unit: 'kg',
  cost_per_unit: 0.9,
  purchase_unit_weight_kg: null,
  allergens: [],
  is_active: true,
  vat_rate: VatRate.PTU_B,
  consumption_type: ConsumptionType.PRODUCT,
  shelf_life_days: 0,
  default_min_quantity: 30,
  storage_location: 'Regal A / Polka 2',
  created_at: '2026-03-16T10:00:00Z',
  updated_at: '2026-03-16T10:00:00Z',
  warehouse_id: 'wh-001',
  warehouse_name: 'Magazyn glowny',
  quantity: 80,
  min_quantity: 30,
  warehouse_stock_id: 'ws-001',
};

describe('StockTable', () => {
  it('renders the compact grouped columns', () => {
    render(<StockTable items={[item]} showWarehouseColumn />);

    expect(screen.getByRole('columnheader', { name: 'Pozycja' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Lokalizacja' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Stan' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Koszt / status' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'SKU' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Jednostka' })).not.toBeInTheDocument();
    expect(screen.getByText('RAW-VEG-009 • kg')).toBeInTheDocument();
    expect(screen.getByText('Magazyn glowny')).toBeInTheDocument();
    expect(screen.getByText('Regal A / Polka 2')).toBeInTheDocument();
  });

  it('uses a single correction action that opens the adjustment dialog', () => {
    render(
      <StockTable
        items={[item]}
        onAdjustStock={vi.fn(async () => undefined)}
        onDeleteStockItem={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByRole('button', { name: 'Korekta' })).toBeInTheDocument();
    expect(document.querySelector('[data-action="increase-stock"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-action="decrease-stock"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Korekta' }));

    expect(screen.getByText('Korekta stanu: Limonka')).toBeInTheDocument();
  });
});
