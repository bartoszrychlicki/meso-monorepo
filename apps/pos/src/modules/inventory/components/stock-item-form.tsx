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
import { StockItem, Warehouse } from '@/types/inventory';
import { ProductCategory, Allergen, VatRate, ConsumptionType } from '@/types/enums';
import { ALLERGEN_LABELS } from '@/lib/constants';
import { UNIT_OPTIONS, VAT_RATE_LABELS, CONSUMPTION_TYPE_LABELS } from '@/lib/constants/inventory';
import { toast } from 'sonner';
import { DecimalInput } from '@/components/ui/decimal-input';

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  onSubmit: (
    data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>,
    warehouseId: string,
    quantity: number,
    minQuantity: number
  ) => Promise<void>;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.RAW_MATERIAL]: 'Surowiec',
  [ProductCategory.SEMI_FINISHED]: 'Polprodukt',
  [ProductCategory.FINISHED_GOOD]: 'Gotowy produkt',
};

export function StockItemForm({ open, onOpenChange, warehouses, onSubmit }: StockItemFormProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.RAW_MATERIAL);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [vatRate, setVatRate] = useState<VatRate>(VatRate.PTU_B);
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>(ConsumptionType.PRODUCT);
  const [shelfLifeDays, setShelfLifeDays] = useState(0);
  const [storageLocation, setStorageLocation] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setSku('');
    setUnit('kg');
    setCategory(ProductCategory.RAW_MATERIAL);
    setCostPerUnit(0);
    setVatRate(VatRate.PTU_B);
    setConsumptionType(ConsumptionType.PRODUCT);
    setShelfLifeDays(0);
    setStorageLocation('');
    setSelectedAllergens([]);
    setWarehouseId('');
    setQuantity(0);
    setMinQuantity(0);
  };

  const toggleAllergen = (allergen: Allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Podaj nazwe produktu');
      return;
    }
    if (costPerUnit <= 0) {
      toast.error('Podaj cene za jednostke');
      return;
    }
    if (!warehouseId) {
      toast.error('Wybierz magazyn');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          sku: sku.trim(),
          product_category: category,
          unit,
          cost_per_unit: costPerUnit,
          allergens: selectedAllergens,
          is_active: true,
          vat_rate: vatRate,
          consumption_type: consumptionType,
          shelf_life_days: shelfLifeDays,
          default_min_quantity: minQuantity,
          storage_location: storageLocation.trim() || null,
        },
        warehouseId,
        quantity,
        minQuantity
      );
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-component="stock-item-form">
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
              <Label htmlFor="stock-sku">SKU</Label>
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
              <Label htmlFor="stock-category">Kategoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                <SelectTrigger id="stock-category" data-field="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProductCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-unit">Jednostka</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="stock-unit" data-field="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-cost">Koszt/jedn. (PLN) *</Label>
              <DecimalInput
                value={costPerUnit}
                onChange={setCostPerUnit}
                placeholder="0,00"
                data-field="cost-per-unit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-vat">Stawka VAT (PTU)</Label>
              <Select value={vatRate} onValueChange={(v) => setVatRate(v as VatRate)}>
                <SelectTrigger id="stock-vat" data-field="vat-rate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VatRate).map((rate) => (
                    <SelectItem key={rate} value={rate}>
                      {VAT_RATE_LABELS[rate]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-consumption">Rozchod</Label>
              <Select value={consumptionType} onValueChange={(v) => setConsumptionType(v as ConsumptionType)}>
                <SelectTrigger id="stock-consumption" data-field="consumption-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ConsumptionType).map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {CONSUMPTION_TYPE_LABELS[ct]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-shelf-life">Waznosc (dni)</Label>
              <Input
                id="stock-shelf-life"
                type="number"
                min={0}
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(Number(e.target.value))}
                data-field="shelf-life-days"
              />
              <p className="text-xs text-muted-foreground">0 = brak sledzenia</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-storage">Polozenie</Label>
            <Input
              id="stock-storage"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="np. Regal A, Polka 3"
              data-field="storage-location"
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">Przypisanie do magazynu *</p>
            <div className="space-y-2">
              <Label htmlFor="stock-warehouse">Magazyn</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="stock-warehouse" data-field="warehouse">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock-quantity">Ilosc poczatkowa</Label>
                <DecimalInput
                  value={quantity}
                  onChange={setQuantity}
                  placeholder="0"
                  data-field="quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-min">Stan minimalny</Label>
                <DecimalInput
                  value={minQuantity}
                  onChange={setMinQuantity}
                  placeholder="0"
                  data-field="min-quantity"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alergeny</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Allergen).map((allergen) => (
                <Button
                  key={allergen}
                  type="button"
                  variant={selectedAllergens.includes(allergen) ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleAllergen(allergen)}
                  data-field={`allergen-${allergen}`}
                  data-value={selectedAllergens.includes(allergen) ? 'selected' : 'unselected'}
                >
                  {ALLERGEN_LABELS[allergen]}
                </Button>
              ))}
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
