'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Warehouse } from '@/types/inventory';

interface InventoryCountCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  selectedWarehouseId: string | null;
  onCreate: (scope: 'single' | 'all', warehouseId?: string) => Promise<void>;
}

const ALL_WAREHOUSES = '__all__';

export function InventoryCountCreateDialog({
  open,
  onOpenChange,
  warehouses,
  selectedWarehouseId,
  onCreate,
}: InventoryCountCreateDialogProps) {
  const [scopeValue, setScopeValue] = useState<string>(selectedWarehouseId ?? ALL_WAREHOUSES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultWarehouseId = useMemo(
    () => warehouses.find((warehouse) => warehouse.is_default)?.id ?? warehouses[0]?.id ?? '',
    [warehouses]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setScopeValue(selectedWarehouseId ?? ALL_WAREHOUSES);
  }, [open, selectedWarehouseId]);

  const isAllWarehouses = scopeValue === ALL_WAREHOUSES;
  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === scopeValue);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      if (isAllWarehouses) {
        await onCreate('all');
      } else {
        await onCreate('single', scopeValue || defaultWarehouseId);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-component="inventory-count-create-dialog">
        <DialogHeader>
          <DialogTitle>Nowa inwentaryzacja</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="inventory-count-warehouse">Zakres magazynu</Label>
            <Select
              value={scopeValue || ALL_WAREHOUSES}
              onValueChange={setScopeValue}
            >
              <SelectTrigger id="inventory-count-warehouse" data-field="inventory-count-warehouse">
                <SelectValue placeholder="Wybierz magazyn..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WAREHOUSES}>Wszystkie magazyny</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {isAllWarehouses
              ? 'Utworzymy jedna inwentaryzacje z sekcjami dla kazdego magazynu.'
              : `Na liscie pojawia sie tylko pozycje przypisane do magazynu: ${selectedWarehouse?.name ?? 'wybranego magazynu'}.`}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || (!isAllWarehouses && !scopeValue && !defaultWarehouseId)}
            data-action="create-inventory-count"
          >
            {isSubmitting ? 'Tworzenie...' : 'Rozpocznij'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
