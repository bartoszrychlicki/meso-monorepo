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
import { StockItem } from '@/types/inventory';
import { ProductCategory, Allergen } from '@/types/enums';
import { ALLERGEN_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const UNIT_OPTIONS = ['kg', 'g', 'szt', 'l', 'ml', 'op'];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.RAW_MATERIAL]: 'Surowiec',
  [ProductCategory.SEMI_FINISHED]: 'Polprodukt',
  [ProductCategory.FINISHED_GOOD]: 'Gotowy produkt',
};

export function StockItemForm({ open, onOpenChange, onSubmit }: StockItemFormProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.RAW_MATERIAL);
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setSku('');
    setUnit('kg');
    setCategory(ProductCategory.RAW_MATERIAL);
    setQuantity(0);
    setMinQuantity(0);
    setCostPerUnit(0);
    setSelectedAllergens([]);
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
    if (!sku.trim()) {
      toast.error('Podaj SKU');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim(),
        product_category: category,
        unit,
        quantity,
        min_quantity: minQuantity,
        cost_per_unit: costPerUnit,
        allergens: selectedAllergens,
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
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">Ilosc</Label>
              <Input
                id="stock-quantity"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                data-field="quantity"
              />
            </div>
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
