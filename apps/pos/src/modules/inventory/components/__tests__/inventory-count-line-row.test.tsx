import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { InventoryCountLineRow } from '../inventory-count-line-row';
import type { InventoryCategory, InventoryCountLine } from '@/types/inventory';

const categories: InventoryCategory[] = [
  {
    id: 'cat-001',
    name: 'Warzywa',
    description: null,
    sort_order: 0,
    is_active: true,
    created_at: '2026-03-16T10:00:00Z',
    updated_at: '2026-03-16T10:00:00Z',
  },
];

const line: InventoryCountLine = {
  id: 'line-001',
  inventory_count_id: 'count-001',
  warehouse_id: 'wh-001',
  stock_item_id: 'item-001',
  stock_item_name: 'Edamame (mrozone)',
  stock_item_sku: 'RAW-VEG-007',
  stock_item_unit: 'kg',
  expected_quantity: 0.15,
  counted_quantity: 0.2,
  note: null,
  edited_inventory_category_id: null,
  edited_storage_location: 'Regal A',
  sort_order: 0,
  created_at: '2026-03-16T10:00:00Z',
  updated_at: '2026-03-16T10:00:00Z',
  warehouse_name: 'Magazyn glowny',
};

describe('InventoryCountLineRow', () => {
  it('formats expected quantity and difference without floating point artifacts', () => {
    const { container } = render(
      <table>
        <tbody>
          <InventoryCountLineRow
            line={line}
            categories={categories}
            isReadonly={false}
            onSave={vi.fn(async () => undefined)}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('0,15 kg')).toBeInTheDocument();
    expect(screen.getByText('0,05')).toBeInTheDocument();

    const countedInput = container.querySelector('[data-field="counted-quantity"]');
    expect(countedInput).toBeInTheDocument();
    expect(countedInput?.parentElement).toHaveTextContent('kg');
  });

  it('renders note as a single-line input in expandable details', () => {
    render(
      <table>
        <tbody>
          <InventoryCountLineRow
            line={line}
            categories={categories}
            isReadonly={false}
            onSave={vi.fn(async () => undefined)}
          />
        </tbody>
      </table>
    );

    fireEvent.click(screen.getByRole('button', { name: /szczegoly/i }));

    const noteField = screen.getByPlaceholderText('Opcjonalna uwaga...');
    expect(noteField.tagName).toBe('INPUT');
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
  });
});
