'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StockItem, Warehouse, InventoryCategory } from '@/types/inventory';
import { ProductCategory, Allergen, VatRate, ConsumptionType } from '@/types/enums';
import { ALLERGEN_LABELS } from '@/lib/constants';
import { UNIT_OPTIONS, VAT_RATE_LABELS, CONSUMPTION_TYPE_LABELS } from '@/lib/constants/inventory';
import { toast } from 'sonner';
import { DecimalInput } from '@/components/ui/decimal-input';

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  inventoryCategories?: InventoryCategory[];
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

const NONE_CATEGORY = '__none__';

function generateAutoSku(name: string): string {
  const prefix = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  return `${prefix || 'ITEM'}-${timePart}-${randomPart}`;
}

function getCreateStockItemErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Nie udalo sie dodac pozycji';
  }

  const message = error.message.toLowerCase();
  if (
    message.includes('inventory_stock_items_sku_key') ||
    message.includes('duplicate key value violates unique constraint')
  ) {
    return 'SKU jest juz zajete. Podaj inny kod lub zostaw pole puste (wygenerujemy automatycznie).';
  }

  if (message.includes('inventory_warehouse_stock')) {
    return 'Pozycja zostala utworzona, ale nie udalo sie przypisac jej do magazynu.';
  }

  return 'Nie udalo sie dodac pozycji';
}

function FieldLabel({
  htmlFor,
  children,
  tooltip,
}: {
  htmlFor: string;
  children: ReactNode;
  tooltip?: string;
}) {
  if (!tooltip) return <Label htmlFor={htmlFor}>{children}</Label>;
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">
      {children}
    </p>
  );
}

export function StockItemForm({
  open,
  onOpenChange,
  warehouses,
  inventoryCategories = [],
  onSubmit,
}: StockItemFormProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.RAW_MATERIAL);
  const [inventoryCategoryId, setInventoryCategoryId] = useState<string>(NONE_CATEGORY);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [vatRate, setVatRate] = useState<VatRate>(VatRate.PTU_B);
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>(ConsumptionType.PRODUCT);
  const [shelfLifeDays, setShelfLifeDays] = useState(0);
  const [storageLocation, setStorageLocation] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([]);
  const [warehouseId, setWarehouseId] = useState(() =>
    warehouses.find((w) => w.is_default)?.id ?? ''
  );
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setSku('');
    setUnit('kg');
    setCategory(ProductCategory.RAW_MATERIAL);
    setInventoryCategoryId(NONE_CATEGORY);
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

    const trimmedName = name.trim();
    const normalizedSku = sku.trim() || generateAutoSku(trimmedName);

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          name: trimmedName,
          sku: normalizedSku,
          product_category: category,
          inventory_category_id: inventoryCategoryId === NONE_CATEGORY ? null : inventoryCategoryId,
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
    } catch (error) {
      toast.error(getCreateStockItemErrorMessage(error));
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
        <TooltipProvider>
          <div className="grid gap-3 py-2">
            {/* Group 1 — Identyfikacja */}
            <SectionHeader>Identyfikacja</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
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
                <FieldLabel
                  htmlFor="stock-sku"
                  tooltip="Unikalny kod pozycji. Zostaw puste — system wygeneruje automatycznie."
                >
                  SKU
                </FieldLabel>
                <Input
                  id="stock-sku"
                  placeholder="np. WOL-001 (opcjonalnie)"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  data-field="sku"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="stock-category"
                  tooltip="Surowiec = kupowany z zewnatrz, Polprodukt = wytwarzany w kuchni, Gotowy produkt = sprzedawany klientowi."
                >
                  Typ produktu
                </FieldLabel>
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
                <FieldLabel
                  htmlFor="stock-inventory-category"
                  tooltip="Grupowanie pozycji do raportow i filtrow. Nie wplywa na logike systemu."
                >
                  Kategoria magazynowa
                </FieldLabel>
                <Select value={inventoryCategoryId} onValueChange={setInventoryCategoryId}>
                  <SelectTrigger id="stock-inventory-category" data-field="inventory-category">
                    <SelectValue placeholder="Bez kategorii" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_CATEGORY}>Bez kategorii</SelectItem>
                    {inventoryCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="stock-consumption"
                  tooltip={'"Produkt" = rozchod sztuka po sztuce. "Skladniki" = rozchod automatyczny wg receptury (BOM).'}
                >
                  Rozchod
                </FieldLabel>
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
            </div>

            {/* Group 2 — Koszty i podatki */}
            <SectionHeader>Koszty i podatki</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
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

            {/* Group 3 — Magazyn */}
            <SectionHeader>Magazyn</SectionHeader>

            <div className="space-y-2">
              <Label htmlFor="stock-warehouse">Magazyn *</Label>
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

            <div className="grid grid-cols-2 gap-3">
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
                <FieldLabel
                  htmlFor="stock-min"
                  tooltip="Ponizej tej wartosci pozycja pojawi sie na liscie brakow."
                >
                  Stan minimalny
                </FieldLabel>
                <DecimalInput
                  value={minQuantity}
                  onChange={setMinQuantity}
                  placeholder="0"
                  data-field="min-quantity"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel
                htmlFor="stock-storage"
                tooltip="Fizyczne miejsce w magazynie, np. regal, polka. Czysto informacyjne."
              >
                Polozenie
              </FieldLabel>
              <Input
                id="stock-storage"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="np. Regal A, Polka 3"
                data-field="storage-location"
              />
            </div>

            {/* Group 4 — Dodatkowe */}
            <SectionHeader>Dodatkowe</SectionHeader>

            <div className="space-y-2 max-w-[50%]">
              <FieldLabel
                htmlFor="stock-shelf-life"
                tooltip="Ile dni od przyjecia pozycja jest zdatna do uzycia. 0 = brak sledzenia terminu."
              >
                Waznosc (dni)
              </FieldLabel>
              <Input
                id="stock-shelf-life"
                type="number"
                min={0}
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(Number(e.target.value))}
                data-field="shelf-life-days"
              />
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
        </TooltipProvider>
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
