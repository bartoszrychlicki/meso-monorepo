'use client';

import { useState } from 'react';
import { Warehouse, StockItem } from '@/types/inventory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle } from 'lucide-react';

interface WarehouseDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
  warehouses: Warehouse[];
  stockItems: StockItem[];
  onConfirm: (transferToWarehouseId?: string) => Promise<void>;
}

export function WarehouseDeleteDialog({
  open,
  onOpenChange,
  warehouse,
  warehouses,
  stockItems,
  onConfirm,
}: WarehouseDeleteDialogProps) {
  const [deleteOption, setDeleteOption] = useState<'transfer' | 'delete_all'>('transfer');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!warehouse) return null;

  const itemsInWarehouse = stockItems.filter((item) => item.warehouse_id === warehouse.id);
  const availableWarehouses = warehouses.filter((w) => w.id !== warehouse.id && w.is_active);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      if (deleteOption === 'transfer' && targetWarehouseId) {
        await onConfirm(targetWarehouseId);
      } else {
        await onConfirm();
      }
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setDeleteOption('transfer');
      setTargetWarehouseId('');
    }
  };

  const canDelete = itemsInWarehouse.length === 0 ||
    deleteOption === 'delete_all' ||
    (deleteOption === 'transfer' && targetWarehouseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Usuń magazyn
          </DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć magazyn <strong>{warehouse.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        {itemsInWarehouse.length > 0 && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/50 dark:bg-yellow-950/20">
              <p className="text-sm font-medium">
                Magazyn zawiera <strong>{itemsInWarehouse.length}</strong> pozycji magazynowych.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Wybierz co zrobić z produktami:
              </p>
            </div>

            <RadioGroup value={deleteOption} onValueChange={(v: string) => setDeleteOption(v as 'transfer' | 'delete_all')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="font-normal cursor-pointer">
                  Przenieś wszystkie produkty do innego magazynu
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete_all" id="delete_all" />
                <Label htmlFor="delete_all" className="font-normal cursor-pointer text-destructive">
                  Usuń wszystkie produkty wraz z magazynem
                </Label>
              </div>
            </RadioGroup>

            {deleteOption === 'transfer' && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="target-warehouse">Docelowy magazyn</Label>
                <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                  <SelectTrigger id="target-warehouse" data-field="target-warehouse">
                    <SelectValue placeholder="Wybierz magazyn" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWarehouses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Brak dostępnych magazynów
                      </div>
                    ) : (
                      availableWarehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {availableWarehouses.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Musisz usunąć wszystkie produkty, ponieważ nie ma innych aktywnych magazynów.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {itemsInWarehouse.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            Magazyn jest pusty. Możesz go bezpiecznie usunąć.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
            data-action="confirm-delete-warehouse"
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń magazyn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
