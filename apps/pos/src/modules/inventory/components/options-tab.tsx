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
  const [costPerUnit, setCostPerUnit] = useState(item.cost_per_unit);
  const [shelfLifeDays, setShelfLifeDays] = useState(item.shelf_life_days);
  const [defaultMinQuantity, setDefaultMinQuantity] = useState(item.default_min_quantity);
  const [storageLocation, setStorageLocation] = useState(item.storage_location ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    category !== item.product_category ||
    (inventoryCategoryId === NONE_CATEGORY ? null : inventoryCategoryId) !== (item.inventory_category_id ?? null) ||
    costPerUnit !== item.cost_per_unit ||
    shelfLifeDays !== item.shelf_life_days ||
    defaultMinQuantity !== item.default_min_quantity ||
    (storageLocation || null) !== item.storage_location;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(item.id, {
        product_category: category,
        inventory_category_id: inventoryCategoryId === NONE_CATEGORY ? null : inventoryCategoryId,
        cost_per_unit: costPerUnit,
        shelf_life_days: shelfLifeDays,
        default_min_quantity: defaultMinQuantity,
        storage_location: storageLocation.trim() || null,
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
            <Label htmlFor="item-cost">Koszt/jedn. (PLN)</Label>
            <Input
              id="item-cost"
              type="number"
              min={0}
              step={0.01}
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(Number(e.target.value))}
              data-field="cost-per-unit"
            />
          </div>
        </div>

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
            <Input
              id="item-default-min"
              type="number"
              min={0}
              step={0.01}
              value={defaultMinQuantity}
              onChange={(e) => setDefaultMinQuantity(Number(e.target.value))}
              data-field="default-min-quantity"
            />
            <p className="text-xs text-muted-foreground">
              Stosowany jako domyslna wartosc przy nowym przypisaniu do magazynu
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-storage">Polozenie</Label>
            <Input
              id="item-storage"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="np. Regal A, Polka 3"
              data-field="storage-location"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
