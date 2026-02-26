'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StockItem } from '@/types/inventory';
import { X } from 'lucide-react';

export interface DeliveryLineRow {
  id: string;
  stock_item_id: string;
  stock_item_name: string;
  quantity_ordered: number | null;
  quantity_received: number | null;
  unit_price_net: number | null;
  vat_rate: string | null;
  expiry_date: string | null;
  notes: string;
  ai_matched_name: string | null;
  ai_confidence: number | null;
}

function generateTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyRow(): DeliveryLineRow {
  return {
    id: generateTempId(),
    stock_item_id: '',
    stock_item_name: '',
    quantity_ordered: null,
    quantity_received: null,
    unit_price_net: null,
    vat_rate: null,
    expiry_date: null,
    notes: '',
    ai_matched_name: null,
    ai_confidence: null,
  };
}

function isRowEmpty(row: DeliveryLineRow): boolean {
  return (
    !row.stock_item_id &&
    !row.stock_item_name &&
    row.quantity_ordered == null &&
    row.quantity_received == null &&
    row.unit_price_net == null &&
    !row.notes
  );
}

interface DeliveryLineTableProps {
  items: DeliveryLineRow[];
  onItemsChange: (items: DeliveryLineRow[]) => void;
  stockItems: StockItem[];
}

export function DeliveryLineTable({
  items,
  onItemsChange,
  stockItems,
}: DeliveryLineTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const notesInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Ensure there's always an empty row at the bottom
  useEffect(() => {
    if (items.length === 0 || !isRowEmpty(items[items.length - 1])) {
      onItemsChange([...items, createEmptyRow()]);
    }
  }, [items, onItemsChange]);

  const getFilteredStockItems = useCallback(
    (rowIndex: number) => {
      const term = (searchTerms[rowIndex] ?? '').toLowerCase().trim();
      if (!term) return stockItems.slice(0, 20);
      return stockItems
        .filter(
          (si) =>
            si.name.toLowerCase().includes(term) ||
            si.sku.toLowerCase().includes(term)
        )
        .slice(0, 20);
    },
    [searchTerms, stockItems]
  );

  const updateRow = (index: number, updates: Partial<DeliveryLineRow>) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    onItemsChange(newItems);
  };

  const selectStockItem = (rowIndex: number, stockItem: StockItem) => {
    updateRow(rowIndex, {
      stock_item_id: stockItem.id,
      stock_item_name: stockItem.name,
      unit_price_net: stockItem.cost_per_unit || null,
    });
    setActiveDropdown(null);
    setSearchTerms((prev) => ({ ...prev, [rowIndex]: '' }));
    setHighlightedIndex(-1);
  };

  const deleteRow = (index: number) => {
    // Don't allow deleting the only empty row
    if (items.length === 1 && isRowEmpty(items[0])) return;
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const handleProductInputChange = (rowIndex: number, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [rowIndex]: value }));
    setActiveDropdown(rowIndex);
    setHighlightedIndex(-1);

    // If value is cleared, reset the stock item selection
    if (!value.trim()) {
      updateRow(rowIndex, {
        stock_item_id: '',
        stock_item_name: '',
      });
    }
  };

  const handleProductKeyDown = (
    rowIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (activeDropdown !== rowIndex) return;

    const filtered = getFilteredStockItems(rowIndex);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        selectStockItem(rowIndex, filtered[highlightedIndex]);
      } else if (filtered.length === 1) {
        selectStockItem(rowIndex, filtered[0]);
      }
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
      setHighlightedIndex(-1);
    }
  };

  const handleNotesKeyDown = (
    rowIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      // If this is the last non-empty row, add a new one and focus its product input
      const isLastNonEmpty =
        rowIndex === items.length - 2 && !isRowEmpty(items[rowIndex]);
      const isLastRow = rowIndex === items.length - 1;

      if (isLastNonEmpty || isLastRow) {
        e.preventDefault();
        // The useEffect will add a new empty row if needed. Focus the product input of the last row.
        const nextRowIndex = rowIndex + 1;
        setTimeout(() => {
          productInputRefs.current[nextRowIndex]?.focus();
        }, 50);
      }
    }
  };

  const handleProductBlur = (rowIndex: number) => {
    // Delay closing dropdown to allow click on items
    setTimeout(() => {
      if (activeDropdown === rowIndex) {
        setActiveDropdown(null);
        setHighlightedIndex(-1);
      }
    }, 200);
  };

  return (
    <div className="rounded-md border overflow-x-auto" data-component="delivery-line-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">Produkt</TableHead>
            <TableHead className="w-[100px]">Zamowiono</TableHead>
            <TableHead className="w-[100px]">Przyjeto</TableHead>
            <TableHead className="w-[120px]">Cena netto</TableHead>
            <TableHead className="w-[130px]">Data waznosci</TableHead>
            <TableHead className="w-[180px]">Notatki</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row, index) => {
            const filtered = getFilteredStockItems(index);
            const showDropdown = activeDropdown === index && filtered.length > 0;

            return (
              <TableRow key={row.id} data-row={index}>
                {/* Product column */}
                <TableCell className="relative p-1">
                  <input
                    ref={(el) => {
                      productInputRefs.current[index] = el;
                    }}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Wpisz nazwe produktu..."
                    value={
                      activeDropdown === index
                        ? searchTerms[index] ?? row.stock_item_name
                        : row.stock_item_name
                    }
                    onChange={(e) => handleProductInputChange(index, e.target.value)}
                    onFocus={() => {
                      setActiveDropdown(index);
                      if (!searchTerms[index] && row.stock_item_name) {
                        setSearchTerms((prev) => ({
                          ...prev,
                          [index]: row.stock_item_name,
                        }));
                      }
                    }}
                    onBlur={() => handleProductBlur(index)}
                    onKeyDown={(e) => handleProductKeyDown(index, e)}
                    data-field="product"
                    aria-label="Produkt"
                  />
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 left-1 right-1 top-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg"
                    >
                      {filtered.map((si, i) => (
                        <button
                          key={si.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                            i === highlightedIndex ? 'bg-accent' : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectStockItem(index, si);
                          }}
                          data-action="select-stock-item"
                          data-id={si.id}
                        >
                          <span className="font-medium">{si.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {si.sku} &middot; {si.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </TableCell>

                {/* Quantity ordered */}
                <TableCell className="p-1">
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="—"
                    value={row.quantity_ordered ?? ''}
                    onChange={(e) =>
                      updateRow(index, {
                        quantity_ordered: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    step="any"
                    min="0"
                    data-field="quantity-ordered"
                    aria-label="Ilosc zamowiona"
                  />
                </TableCell>

                {/* Quantity received */}
                <TableCell className="p-1">
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0"
                    value={row.quantity_received ?? ''}
                    onChange={(e) =>
                      updateRow(index, {
                        quantity_received: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    step="any"
                    min="0"
                    data-field="quantity-received"
                    aria-label="Ilosc przyjeta"
                  />
                </TableCell>

                {/* Unit price net */}
                <TableCell className="p-1">
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="—"
                    value={row.unit_price_net ?? ''}
                    onChange={(e) =>
                      updateRow(index, {
                        unit_price_net: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    step="0.01"
                    min="0"
                    data-field="unit-price-net"
                    aria-label="Cena netto"
                  />
                </TableCell>

                {/* Expiry date */}
                <TableCell className="p-1">
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={row.expiry_date ?? ''}
                    onChange={(e) =>
                      updateRow(index, {
                        expiry_date: e.target.value || null,
                      })
                    }
                    data-field="expiry-date"
                    aria-label="Data waznosci"
                  />
                </TableCell>

                {/* Notes */}
                <TableCell className="p-1">
                  <input
                    ref={(el) => {
                      notesInputRefs.current[index] = el;
                    }}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder=""
                    value={row.notes}
                    onChange={(e) => updateRow(index, { notes: e.target.value })}
                    onKeyDown={(e) => handleNotesKeyDown(index, e)}
                    data-field="notes"
                    aria-label="Notatki"
                  />
                </TableCell>

                {/* Delete button */}
                <TableCell className="p-1">
                  {!(items.length === 1 && isRowEmpty(row)) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRow(index)}
                      data-action="delete-row"
                      data-row={index}
                      aria-label="Usun wiersz"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
