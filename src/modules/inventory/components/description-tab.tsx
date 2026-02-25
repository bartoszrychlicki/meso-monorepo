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
import { StockItem } from '@/types/inventory';
import { Allergen, VatRate, ConsumptionType } from '@/types/enums';
import { ALLERGEN_LABELS } from '@/lib/constants';
import { VAT_RATE_LABELS, CONSUMPTION_TYPE_LABELS, UNIT_OPTIONS } from '@/lib/constants/inventory';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface DescriptionTabProps {
  item: StockItem;
  onSave: (id: string, data: Partial<StockItem>) => Promise<void>;
}

export function DescriptionTab({ item, onSave }: DescriptionTabProps) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [vatRate, setVatRate] = useState<VatRate>(item.vat_rate);
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>(item.consumption_type);
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>(item.allergens);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    name !== item.name ||
    unit !== item.unit ||
    vatRate !== item.vat_rate ||
    consumptionType !== item.consumption_type ||
    JSON.stringify(selectedAllergens) !== JSON.stringify(item.allergens);

  const toggleAllergen = (allergen: Allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nazwa jest wymagana');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(item.id, {
        name: name.trim(),
        unit,
        vat_rate: vatRate,
        consumption_type: consumptionType,
        allergens: selectedAllergens,
      });
      toast.success('Zapisano zmiany');
    } catch {
      toast.error('Nie udalo sie zapisac zmian');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-component="description-tab">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Opis pozycji</CardTitle>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} size="sm" data-action="save-description">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">Nazwa</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-field="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-unit">Jednostka</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="item-unit" data-field="unit">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="item-vat">Stawka VAT (PTU)</Label>
            <Select value={vatRate} onValueChange={(v) => setVatRate(v as VatRate)}>
              <SelectTrigger id="item-vat" data-field="vat-rate">
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
          <div className="space-y-2">
            <Label htmlFor="item-consumption">Rozchod</Label>
            <Select value={consumptionType} onValueChange={(v) => setConsumptionType(v as ConsumptionType)}>
              <SelectTrigger id="item-consumption" data-field="consumption-type">
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
      </CardContent>
    </Card>
  );
}
