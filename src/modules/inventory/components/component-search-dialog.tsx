'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useInventoryStore } from '@/modules/inventory/store';
import { Search } from 'lucide-react';

interface ComponentSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (componentId: string, quantity: number) => Promise<void>;
  excludeItemId: string;
  excludeComponentIds: string[];
}

export function ComponentSearchDialog({
  open,
  onOpenChange,
  onAdd,
  excludeItemId,
  excludeComponentIds,
}: ComponentSearchDialogProps) {
  const { stockItems, loadStockItems } = useInventoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open && stockItems.length === 0) {
      loadStockItems();
    }
  }, [open, stockItems.length, loadStockItems]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedId(null);
      setQuantity(1);
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    const excluded = new Set([excludeItemId, ...excludeComponentIds]);
    return stockItems
      .filter((item) => !excluded.has(item.id))
      .filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      });
  }, [stockItems, excludeItemId, excludeComponentIds, searchQuery]);

  const selectedItem = stockItems.find((item) => item.id === selectedId);

  const handleAdd = async () => {
    if (!selectedId || quantity <= 0) return;
    setIsAdding(true);
    try {
      await onAdd(selectedId, quantity);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-component="component-search-dialog">
        <DialogHeader>
          <DialogTitle>Dodaj skladnik</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po nazwie lub SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-field="component-search"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md border">
            {filteredItems.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Brak pasujacych pozycji
              </p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                    selectedId === item.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedId(item.id)}
                  data-action="select-component"
                  data-id={item.id}
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 text-muted-foreground">{item.sku}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{item.unit}</span>
                </button>
              ))
            )}
          </div>

          {selectedItem && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">
                Wybrany: {selectedItem.name} ({selectedItem.unit})
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="component-qty" className="shrink-0">Ilosc:</Label>
                <Input
                  id="component-qty"
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-28"
                  data-field="component-quantity"
                />
                <span className="text-sm text-muted-foreground">{selectedItem.unit}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="cancel-add-component"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedId || quantity <= 0 || isAdding}
            data-action="confirm-add-component"
          >
            {isAdding ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
