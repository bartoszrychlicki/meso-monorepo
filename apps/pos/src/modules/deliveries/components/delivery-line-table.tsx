'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockItem } from '@/types/inventory';
import { X, Plus, PackagePlus } from 'lucide-react';
import { DecimalInput } from '@/components/ui/decimal-input';
import { normalizeDeliveryValues } from '../utils/normalization';

export interface DeliveryLineRow {
  id: string;
  stock_item_id: string;
  stock_item_name: string;
  quantity_ordered: number | null;
  supplier_quantity_received: number | null;
  supplier_unit: string | null;
  quantity_received: number | null;
  unit_price_net: number | null;
  price_per_kg_net: number | null;
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
    supplier_quantity_received: null,
    supplier_unit: null,
    quantity_received: null,
    unit_price_net: null,
    price_per_kg_net: null,
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
    row.supplier_quantity_received == null &&
    row.quantity_received == null &&
    row.unit_price_net == null &&
    !row.notes
  );
}

interface DeliveryLineTableProps {
  items: DeliveryLineRow[];
  onItemsChange: (items: DeliveryLineRow[]) => void;
  stockItems: StockItem[];
  onCreateNewItem?: (searchTerm: string, rowIndex: number) => void;
}

export function DeliveryLineTable({
  items,
  onItemsChange,
  stockItems,
  onCreateNewItem,
}: DeliveryLineTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const notesInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const stockItemMap = useMemo(
    () => new Map(stockItems.map((stockItem) => [stockItem.id, stockItem])),
    [stockItems]
  );

  // Ensure there's always an empty row at the bottom
  useEffect(() => {
    if (items.length === 0 || !isRowEmpty(items[items.length - 1])) {
      onItemsChange([...items, createEmptyRow()]);
    }
  }, [items, onItemsChange]);

  // Track dropdown position based on the active input
  useEffect(() => {
    if (activeDropdown === null) {
      return;
    }

    const input = productInputRefs.current[activeDropdown];
    if (!input) {
      return;
    }

    const updateRect = () => {
      setDropdownRect(input.getBoundingClientRect());
    };

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [activeDropdown]);

  const openDropdown = (rowIndex: number, input: HTMLInputElement) => {
    setActiveDropdown(rowIndex);
    setDropdownRect(input.getBoundingClientRect());
  };

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

  const normalizeRow = useCallback(
    (row: DeliveryLineRow): DeliveryLineRow => {
      const stockItem = stockItemMap.get(row.stock_item_id);
      if (!stockItem) {
        return {
          ...row,
          price_per_kg_net: null,
          quantity_received: null,
        };
      }

      const supplierUnit = row.supplier_unit ?? stockItem.unit;
      const normalized = normalizeDeliveryValues(
        stockItem,
        row.supplier_quantity_received,
        supplierUnit,
        row.unit_price_net
      );

      return {
        ...row,
        supplier_unit: supplierUnit,
        price_per_kg_net: normalized.price_per_kg_net,
        quantity_received: normalized.quantity_received,
      };
    },
    [stockItemMap]
  );

  const updateRow = (index: number, updates: Partial<DeliveryLineRow>) => {
    const newItems = items.map((item, i) =>
      i === index ? normalizeRow({ ...item, ...updates }) : item
    );
    onItemsChange(newItems);
  };

  const selectStockItem = (rowIndex: number, stockItem: StockItem) => {
    updateRow(rowIndex, {
      stock_item_id: stockItem.id,
      stock_item_name: stockItem.name,
      supplier_unit: stockItem.unit,
      unit_price_net: stockItem.cost_per_unit || null,
    });
    setActiveDropdown(null);
    setDropdownRect(null);
    setSearchTerms((prev) => ({ ...prev, [rowIndex]: '' }));
    setHighlightedIndex(-1);
  };

  const deleteRow = (index: number) => {
    if (items.length === 1 && isRowEmpty(items[0])) return;
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const addNewRow = () => {
    if (items.length > 0 && isRowEmpty(items[items.length - 1])) {
      productInputRefs.current[items.length - 1]?.focus();
      return;
    }
    const newItems = [...items, createEmptyRow()];
    onItemsChange(newItems);
    setTimeout(() => {
      productInputRefs.current[newItems.length - 1]?.focus();
    }, 50);
  };

  const handleProductInputChange = (
    rowIndex: number,
    value: string,
    input: HTMLInputElement
  ) => {
    setSearchTerms((prev) => ({ ...prev, [rowIndex]: value }));
    openDropdown(rowIndex, input);
    setHighlightedIndex(-1);

    if (!value.trim()) {
      updateRow(rowIndex, {
        stock_item_id: '',
        stock_item_name: '',
        supplier_unit: null,
        quantity_received: null,
        unit_price_net: null,
        price_per_kg_net: null,
      });
    }
  };

  const handleProductKeyDown = (
    rowIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (activeDropdown !== rowIndex) return;

    const filtered = getFilteredStockItems(rowIndex);
    const hasSearchTerm = (searchTerms[rowIndex] ?? '').trim().length > 0;
    const hasCreateOption = !!onCreateNewItem && hasSearchTerm;
    const totalOptions = filtered.length + (hasCreateOption ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        selectStockItem(rowIndex, filtered[highlightedIndex]);
      } else if (hasCreateOption && highlightedIndex === filtered.length) {
        onCreateNewItem!((searchTerms[rowIndex] ?? '').trim(), rowIndex);
        setActiveDropdown(null);
        setDropdownRect(null);
        setHighlightedIndex(-1);
      } else if (filtered.length === 1) {
        selectStockItem(rowIndex, filtered[0]);
      }
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
      setDropdownRect(null);
      setHighlightedIndex(-1);
    }
  };

  const handleNotesKeyDown = (
    rowIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLastNonEmpty =
        rowIndex === items.length - 2 && !isRowEmpty(items[rowIndex]);
      const isLastRow = rowIndex === items.length - 1;

      if (isLastNonEmpty || isLastRow) {
        e.preventDefault();
        const nextRowIndex = rowIndex + 1;
        setTimeout(() => {
          productInputRefs.current[nextRowIndex]?.focus();
        }, 50);
      }
    }
  };

  const handleProductBlur = (rowIndex: number) => {
    setTimeout(() => {
      if (activeDropdown === rowIndex) {
        setActiveDropdown(null);
        setDropdownRect(null);
        setHighlightedIndex(-1);
      }
    }, 200);
  };

  const filledRowCount = items.filter((r) => !isRowEmpty(r)).length;

  // Render dropdown content for the active row
  const renderDropdownPortal = () => {
    if (activeDropdown === null || !dropdownRect) return null;

    const index = activeDropdown;
    const filtered = getFilteredStockItems(index);
    const hasSearchTerm = (searchTerms[index] ?? '').trim().length > 0;

    if (filtered.length === 0 && !hasSearchTerm) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: dropdownRect.bottom + 4,
          left: dropdownRect.left,
          width: dropdownRect.width,
          zIndex: 9999,
        }}
        className="max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg"
      >
        {filtered.length > 0 ? (
          filtered.map((si, i) => (
            <button
              key={si.id}
              type="button"
              className={`
                w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2
                transition-colors
                ${i === highlightedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
                ${i > 0 ? 'border-t border-border/30' : ''}
              `}
              onMouseDown={(e) => {
                e.preventDefault();
                selectStockItem(index, si);
              }}
              data-action="select-stock-item"
              data-id={si.id}
            >
              <span className="font-medium truncate">{si.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono rounded">
                  {si.sku}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{si.unit}</span>
              </div>
            </button>
          ))
        ) : hasSearchTerm ? (
          <div className="px-3 py-2.5 text-sm text-muted-foreground">
            Brak wynikow dla &ldquo;{searchTerms[index]}&rdquo;
          </div>
        ) : null}
        {onCreateNewItem && hasSearchTerm && (
          <>
            {filtered.length > 0 && (
              <div className="border-t border-border/50" />
            )}
            <button
              type="button"
              className={`
                w-full text-left px-3 py-2.5 text-sm flex items-center gap-2
                transition-colors text-primary font-medium
                ${highlightedIndex === filtered.length ? 'bg-accent' : 'hover:bg-accent/50'}
              `}
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateNewItem((searchTerms[index] ?? '').trim(), index);
                setActiveDropdown(null);
                setHighlightedIndex(-1);
              }}
              data-action="create-new-stock-item"
            >
              <PackagePlus className="h-3.5 w-3.5" />
              <span>Dodaj nowy: &ldquo;{searchTerms[index]}&rdquo;</span>
            </button>
          </>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div data-component="delivery-line-table">
      <div className="rounded-lg border border-border/60 bg-card">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                <TableHead className="w-[40px] text-center text-xs font-semibold text-muted-foreground">#</TableHead>
                <TableHead className="w-[280px] text-xs font-semibold">Produkt</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold text-right pr-3">Zamowiono</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold text-right pr-3">Przyjeto</TableHead>
                <TableHead className="w-[80px] text-xs font-semibold">Jedn.</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold text-right pr-3">Cena netto</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">Data waznosci</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">Notatki</TableHead>
                <TableHead className="w-[44px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, index) => {
                const isEmpty = isRowEmpty(row);
                const isLast = index === items.length - 1;

                return (
                  <TableRow
                    key={row.id}
                    data-row={index}
                    className={`
                      ${isEmpty && isLast ? 'bg-muted/20' : 'hover:bg-accent/30'}
                      transition-colors border-b border-border/40
                    `}
                  >
                    {/* Row number */}
                    <TableCell className="p-1.5 text-center">
                      <span className="text-xs text-muted-foreground/70 tabular-nums select-none">
                        {isEmpty && isLast ? '' : index + 1}
                      </span>
                    </TableCell>

                    {/* Product column */}
                    <TableCell className="p-1.5">
                      <input
                        ref={(el) => {
                          productInputRefs.current[index] = el;
                        }}
                        type="text"
                        className={`
                          w-full rounded-md border px-3 py-1.5 text-sm transition-all
                          focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-transparent
                          ${row.stock_item_id
                            ? 'border-transparent bg-transparent font-medium text-foreground'
                            : 'border-input bg-background'
                          }
                          ${isEmpty && isLast ? 'border-dashed border-muted-foreground/30 bg-transparent placeholder:text-muted-foreground/40' : ''}
                        `}
                        placeholder={isEmpty && isLast ? 'Wyszukaj produkt...' : 'Wpisz nazwe produktu...'}
                        value={
                          activeDropdown === index
                            ? searchTerms[index] ?? row.stock_item_name
                            : row.stock_item_name
                        }
                        onChange={(e) =>
                          handleProductInputChange(index, e.target.value, e.currentTarget)
                        }
                        onFocus={(e) => {
                          openDropdown(index, e.currentTarget);
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
                    </TableCell>

                    {/* Quantity ordered */}
                    <TableCell className="p-1.5">
                      <DecimalInput
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right tabular-nums"
                        placeholder="—"
                        value={row.quantity_ordered}
                        onChange={(value) =>
                          updateRow(index, { quantity_ordered: value })
                        }
                        data-field="quantity-ordered"
                        aria-label="Ilosc zamowiona"
                      />
                    </TableCell>

                    {/* Supplier quantity received */}
                    <TableCell className="p-1.5">
                      <div className="space-y-1">
                        <DecimalInput
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right tabular-nums"
                          placeholder="0"
                          value={row.supplier_quantity_received}
                          onChange={(value) =>
                            updateRow(index, {
                              supplier_quantity_received: value,
                            })
                          }
                          data-field="quantity-received"
                          aria-label="Ilosc przyjeta"
                        />
                        {row.stock_item_id && row.supplier_quantity_received != null && (
                          <div className="text-[10px] text-muted-foreground text-right">
                            {row.quantity_received != null
                              ? `mag.: ${row.quantity_received} ${stockItemMap.get(row.stock_item_id)?.unit ?? ''}`
                              : 'brak przelicznika do magazynu'}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Supplier unit */}
                    <TableCell className="p-1.5">
                      <input
                        type="text"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-transparent transition-all"
                        placeholder={stockItemMap.get(row.stock_item_id)?.unit ?? 'kg'}
                        value={row.supplier_unit ?? ''}
                        onChange={(e) =>
                          updateRow(index, {
                            supplier_unit: e.target.value || null,
                          })
                        }
                        data-field="supplier-unit"
                        aria-label="Jednostka dostawcy"
                      />
                    </TableCell>

                    {/* Unit price net */}
                    <TableCell className="p-1.5">
                      <div className="space-y-1">
                        <DecimalInput
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right tabular-nums"
                          placeholder="—"
                          value={row.unit_price_net}
                          onChange={(value) =>
                            updateRow(index, {
                              unit_price_net: value,
                            })
                          }
                          data-field="unit-price-net"
                          aria-label="Cena netto"
                        />
                        {row.price_per_kg_net != null && (
                          <div className="text-[10px] text-muted-foreground text-right">
                            {row.price_per_kg_net.toFixed(2)} PLN/kg
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Expiry date */}
                    <TableCell className="p-1.5">
                      <input
                        type="date"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-transparent transition-all"
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
                    <TableCell className="p-1.5">
                      <input
                        ref={(el) => {
                          notesInputRefs.current[index] = el;
                        }}
                        type="text"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-transparent transition-all"
                        placeholder=""
                        value={row.notes}
                        onChange={(e) => updateRow(index, { notes: e.target.value })}
                        onKeyDown={(e) => handleNotesKeyDown(index, e)}
                        data-field="notes"
                        aria-label="Notatki"
                      />
                    </TableCell>

                    {/* Delete button */}
                    <TableCell className="p-1.5">
                      {!isEmpty && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => deleteRow(index)}
                          data-action="delete-row"
                          data-row={index}
                          aria-label="Usun wiersz"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add row button */}
      <div className="flex items-center gap-3 mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={addNewRow}
          data-action="add-row"
        >
          <Plus className="h-3.5 w-3.5" />
          Dodaj pozycje
        </Button>
        {filledRowCount > 0 && (
          <span className="text-xs text-muted-foreground/60">
            {filledRowCount} {filledRowCount === 1 ? 'pozycja' : filledRowCount < 5 ? 'pozycje' : 'pozycji'}
          </span>
        )}
      </div>

      {/* Dropdown portal - rendered at body level to avoid overflow clipping */}
      {renderDropdownPortal()}
    </div>
  );
}
