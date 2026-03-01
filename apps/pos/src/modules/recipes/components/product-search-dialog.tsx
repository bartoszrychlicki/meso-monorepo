'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StockItem } from '@/types/inventory';
import { Search } from 'lucide-react';

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  onSelect: (stockItem: StockItem) => void;
  excludeIds?: string[];
}

export function ProductSearchDialog({
  open,
  onOpenChange,
  stockItems,
  onSelect,
  excludeIds = [],
}: ProductSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const excluded = new Set(excludeIds);
    return stockItems
      .filter((item) => !excluded.has(item.id))
      .filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q)
        );
      });
  }, [stockItems, excludeIds, searchQuery]);

  const handleSelect = (item: StockItem) => {
    onSelect(item);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSearchQuery('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md" data-component="product-search-dialog">
        <DialogHeader>
          <DialogTitle>Dodaj skladnik z listy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po nazwie lub SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-field="product-search"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border">
            {filteredItems.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Brak pasujacych produktow
              </p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => handleSelect(item)}
                  data-action="select-product"
                  data-id={item.id}
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.sku && (
                      <span className="ml-2 text-muted-foreground">{item.sku}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.cost_per_unit.toFixed(2)} PLN/{item.unit}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="cancel-product-search"
          >
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
