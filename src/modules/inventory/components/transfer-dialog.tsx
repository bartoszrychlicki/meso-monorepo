'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Warehouse, WarehouseStockItem } from '@/types/inventory';
import { toast } from 'sonner';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  warehouseStockItems: WarehouseStockItem[];
  onTransfer: (sourceId: string, targetId: string, itemId: string, quantity: number) => Promise<void>;
}

export function TransferDialog({
  open,
  onOpenChange,
  warehouses,
  warehouseStockItems,
  onTransfer,
}: TransferDialogProps) {
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [stockItemId, setStockItemId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceItems = useMemo(() => {
    if (!sourceWarehouseId) return [];
    return warehouseStockItems.filter(
      (item) => item.warehouse_id === sourceWarehouseId && item.quantity > 0
    );
  }, [sourceWarehouseId, warehouseStockItems]);

  const selectedItem = useMemo(() => {
    return sourceItems.find((item) => item.id === stockItemId);
  }, [sourceItems, stockItemId]);

  const targetItem = useMemo(() => {
    if (!targetWarehouseId || !stockItemId) return null;
    return warehouseStockItems.find(
      (item) => item.warehouse_id === targetWarehouseId && item.id === stockItemId
    );
  }, [targetWarehouseId, stockItemId, warehouseStockItems]);

  const resetForm = () => {
    setSourceWarehouseId('');
    setTargetWarehouseId('');
    setStockItemId('');
    setQuantity(0);
  };

  const handleTransfer = async () => {
    if (!sourceWarehouseId || !targetWarehouseId || !stockItemId || quantity <= 0) return;

    if (sourceWarehouseId === targetWarehouseId) {
      toast.error('Magazyn zrodlowy i docelowy musza byc rozne');
      return;
    }

    if (selectedItem && quantity > selectedItem.quantity) {
      toast.error('Niewystarczajaca ilosc w magazynie zrodlowym');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTransfer(sourceWarehouseId, targetWarehouseId, stockItemId, quantity);
      toast.success('Transfer wykonany pomyslnie');
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Nie udalo sie wykonac transferu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md" data-component="transfer-dialog">
        <DialogHeader>
          <DialogTitle>Transfer miedzy magazynami</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Magazyn zrodlowy *</Label>
            <Select
              value={sourceWarehouseId}
              onValueChange={(v) => {
                setSourceWarehouseId(v);
                setStockItemId('');
                setQuantity(0);
              }}
            >
              <SelectTrigger data-field="source-warehouse">
                <SelectValue placeholder="Wybierz magazyn..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Magazyn docelowy *</Label>
            <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
              <SelectTrigger data-field="target-warehouse">
                <SelectValue placeholder="Wybierz magazyn..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses
                  .filter((w) => w.id !== sourceWarehouseId)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pozycja magazynowa *</Label>
            <Select
              value={stockItemId}
              onValueChange={(v) => {
                setStockItemId(v);
                setQuantity(0);
              }}
              disabled={!sourceWarehouseId}
            >
              <SelectTrigger data-field="transfer-item">
                <SelectValue placeholder={sourceWarehouseId ? 'Wybierz pozycje...' : 'Najpierw wybierz magazyn'} />
              </SelectTrigger>
              <SelectContent>
                {sourceItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stan w zrodlowym:</span>
                <span className="font-medium">{selectedItem.quantity} {selectedItem.unit}</span>
              </div>
              {targetItem && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stan w docelowym:</span>
                  <span className="font-medium">{targetItem.quantity} {targetItem.unit}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Ilosc do transferu *</Label>
            <Input
              type="number"
              min={0}
              max={selectedItem?.quantity ?? 0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={!stockItemId}
              data-field="transfer-quantity"
            />
            {selectedItem && quantity > 0 && (
              <p className="text-xs text-muted-foreground">
                Pozostanie w zrodlowym: {selectedItem.quantity - quantity} {selectedItem.unit}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="cancel-transfer"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              isSubmitting ||
              !sourceWarehouseId ||
              !targetWarehouseId ||
              !stockItemId ||
              quantity <= 0 ||
              (selectedItem ? quantity > selectedItem.quantity : true)
            }
            data-action="confirm-transfer"
          >
            {isSubmitting ? 'Transferowanie...' : 'Transferuj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
