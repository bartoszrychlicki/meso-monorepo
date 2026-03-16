'use client';

import { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { StockItem } from '@/types/inventory';

interface InventoryCountItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableItems: StockItem[];
  onSelect: (stockItemId: string) => Promise<boolean>;
}

export function InventoryCountItemPickerDialog({
  open,
  onOpenChange,
  availableItems,
  onSelect,
}: InventoryCountItemPickerDialogProps) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return availableItems;
    }

    return availableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.sku.toLowerCase().includes(normalizedQuery)
    );
  }, [availableItems, query]);

  const handleSelect = async (stockItemId: string) => {
    const shouldClose = await onSelect(stockItemId);
    if (shouldClose) {
      setQuery('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Dodaj pozycje do inwentaryzacji"
      description="Wybierz istniejaca kartoteke, ktora ma zostac dolaczona do magazynu w tej inwentaryzacji."
      className="max-w-lg"
    >
      <CommandInput
        placeholder="Szukaj po nazwie lub SKU..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Brak pozycji do dodania.</CommandEmpty>
        <CommandGroup heading="Pozycje magazynowe">
          {filteredItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.name} ${item.sku}`}
              onSelect={() => {
                void handleSelect(item.id);
              }}
            >
              <PackagePlus className="h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.sku} · {item.unit}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
