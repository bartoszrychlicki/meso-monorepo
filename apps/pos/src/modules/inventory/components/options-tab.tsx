'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StockItem, InventoryCategory } from '@/types/inventory';
import { ProductCategory } from '@/types/enums';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { DecimalInput } from '@/components/ui/decimal-input';
import { getCostLabelForUnit, isWeightUnit } from '@/lib/utils/unit-conversion';

interface OptionsTabProps {
  item: StockItem;
  inventoryCategories: InventoryCategory[];
  onSave: (id: string, data: Partial<StockItem>) => Promise<void>;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.RAW_MATERIAL]: 'Surowiec',
  [ProductCategory.SEMI_FINISHED]: 'Polprodukt',
  [ProductCategory.FINISHED_GOOD]: 'Gotowy produkt',
};

const NONE_CATEGORY = '__none__';

export function OptionsTab({ item, inventoryCategories, onSave }: OptionsTabProps) {
  const [category, setCategory] = useState<ProductCategory>(item.product_category);
  const [inventoryCategoryId, setInventoryCategoryId] = useState<string>(item.inventory_category_id ?? NONE_CATEGORY);
  const [costPerUnit, setCostPerUnit] = useState<number | null>(item.cost_per_unit);
  const [purchaseUnitWeightKg, setPurchaseUnitWeightKg] = useState<number | null>(
    item.purchase_unit_weight_kg ?? null
  );
  const [shelfLifeDays, setShelfLifeDays] = useState(item.shelf_life_days);
  const [defaultMinQuantity, setDefaultMinQuantity] = useState<number | null>(item.default_min_quantity);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    category !== item.product_category ||
    (inventoryCategoryId === NONE_CATEGORY ? null : inventoryCategoryId) !== (item.inventory_category_id ?? null) ||
    costPerUnit !== item.cost_per_unit ||
    purchaseUnitWeightKg !== (item.purchase_unit_weight_kg ?? null) ||
    shelfLifeDays !== item.shelf_life_days ||
    defaultMinQuantity !== item.default_min_quantity;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(item.id, {
        product_category: category,
        inventory_category_id: inventoryCategoryId === NONE_CATEGORY ? null : inventoryCategoryId,
        cost_per_unit: costPerUnit ?? item.cost_per_unit,
        purchase_unit_weight_kg: item.unit === 'kg' ? purchaseUnitWeightKg ?? null : null,
        shelf_life_days: shelfLifeDays,
        default_min_quantity: defaultMinQuantity ?? 0,
      });
      toast.success('Zapisano zmiany');
    } catch {
      toast.error('Nie udalo sie zapisac zmian');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-component="options-tab">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Opcje</CardTitle>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} size="sm" data-action="save-options">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="item-category">Typ produktu</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
              <SelectTrigger id="item-category" data-field="category">
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
            <Label htmlFor="item-inventory-category">Kategoria magazynowa</Label>
            <Select value={inventoryCategoryId} onValueChange={setInventoryCategoryId}>
              <SelectTrigger id="item-inventory-category" data-field="inventory-category">
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
          <div className="space-y-2">
            <Label htmlFor="item-cost">{getCostLabelForUnit(item.unit)} (PLN)</Label>
            <DecimalInput
              id="item-cost"
              value={costPerUnit}
              onChange={setCostPerUnit}
              data-field="cost-per-unit"
            />
          </div>
        </div>

        {isWeightUnit(item.unit) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-purchase-weight">Waga jednostki zakupu (kg)</Label>
              <DecimalInput
                id="item-purchase-weight"
                value={purchaseUnitWeightKg}
                onChange={setPurchaseUnitWeightKg}
                placeholder="np. 2,5"
                data-field="purchase-unit-weight-kg"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-sku">SKU</Label>
            <Input
              id="item-sku"
              value={item.sku}
              readOnly
              className="bg-muted"
              data-field="sku"
            />
            <p className="text-xs text-muted-foreground">SKU nie mozna zmienic po utworzeniu</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-shelf-life">Waznosc (dni)</Label>
            <Input
              id="item-shelf-life"
              type="number"
              min={0}
              value={shelfLifeDays}
              onChange={(e) => setShelfLifeDays(Number(e.target.value))}
              data-field="shelf-life-days"
            />
            <p className="text-xs text-muted-foreground">0 = brak sledzenia waznosci</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-default-min">Domyslny stan minimalny</Label>
            <DecimalInput
              id="item-default-min"
              value={defaultMinQuantity}
              onChange={setDefaultMinQuantity}
              data-field="default-min-quantity"
            />
            <p className="text-xs text-muted-foreground">
              Stosowany jako domyslna wartosc przy nowym przypisaniu do magazynu
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
