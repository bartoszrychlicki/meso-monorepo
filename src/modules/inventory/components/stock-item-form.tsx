'use client';

import { useState } from 'react';
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
import { Warehouse, StockItem } from '@/types/inventory';
import { StorageZone, ProductCategory } from '@/types/enums';
import { toast } from 'sonner';

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  onSubmit: (data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const STORAGE_ZONE_LABELS: Record<StorageZone, string> = {
  [StorageZone.DRY]: 'Suchy',
  [StorageZone.COLD]: 'Chlodnia',
  [StorageZone.FROZEN]: 'Mroznia',
  [StorageZone.AMBIENT]: 'Temperatura pokojowa',
};

const UNIT_OPTIONS = ['kg', 'szt', 'l', 'op', 'but'];

export function StockItemForm({ open, onOpenChange, warehouses, onSubmit }: StockItemFormProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('szt');
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [storageZone, setStorageZone] = useState<StorageZone>(StorageZone.AMBIENT);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setSku('');
    setUnit('szt');
    setCurrentQuantity(0);
    setMinQuantity(0);
    setMaxQuantity('');
    setWarehouseId('');
    setStorageZone(StorageZone.AMBIENT);
    setCostPerUnit(0);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Podaj nazwe produktu');
      return;
    }
    if (!sku.trim()) {
      toast.error('Podaj SKU');
      return;
    }
    if (!warehouseId) {
      toast.error('Wybierz magazyn');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim(),
        product_category: ProductCategory.RAW_MATERIAL, // TODO: Add UI field in future sprint
        unit,
        purchase_unit: 'szt', // TODO: Add UI field in future sprint
        conversion_rate: 1, // TODO: Add UI field in future sprint
        quantity_physical: currentQuantity,
        quantity_available: currentQuantity,
        quantity_reserved: 0,
        quantity_in_transit: 0,
        min_quantity: minQuantity,
        max_quantity: maxQuantity ? Number(maxQuantity) : undefined,
        warehouse_id: warehouseId,
        storage_zone: storageZone,
        cost_per_unit: costPerUnit,
        allergens: [], // TODO: Add UI field in future sprint
        is_active: true,
      });
      toast.success(`Dodano pozycje: ${name}`);
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Nie udalo sie dodac pozycji');
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
      <DialogContent className="max-w-lg" data-component="stock-item-form">
        <DialogHeader>
          <DialogTitle>Nowa pozycja magazynowa</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-name">Nazwa *</Label>
              <Input
                id="stock-name"
                placeholder="np. Wolowina mielona"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-field="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-sku">SKU *</Label>
              <Input
                id="stock-sku"
                placeholder="np. WOL-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                data-field="sku"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-warehouse">Magazyn *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="stock-warehouse" data-field="warehouse">
                  <SelectValue placeholder="Wybierz magazyn" />
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
              <Label htmlFor="stock-zone">Strefa</Label>
              <Select value={storageZone} onValueChange={(v) => setStorageZone(v as StorageZone)}>
                <SelectTrigger id="stock-zone" data-field="storage-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(StorageZone).map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {STORAGE_ZONE_LABELS[zone]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-unit">Jednostka</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="stock-unit" data-field="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">Ilosc poczatkowa</Label>
              <Input
                id="stock-quantity"
                type="number"
                min={0}
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                data-field="current-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-cost">Koszt/jedn. (PLN)</Label>
              <Input
                id="stock-cost"
                type="number"
                min={0}
                step={0.01}
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(Number(e.target.value))}
                data-field="cost-per-unit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-min">Stan minimalny</Label>
              <Input
                id="stock-min"
                type="number"
                min={0}
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                data-field="min-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-max">Stan maksymalny</Label>
              <Input
                id="stock-max"
                type="number"
                min={0}
                placeholder="Opcjonalnie"
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
                data-field="max-quantity"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="cancel-create"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-action="confirm-create"
          >
            {isSubmitting ? 'Dodawanie...' : 'Dodaj pozycje'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
