'use client';

import { useEffect, useState } from 'react';
import { ModifierGroup, MenuModifier, ModifierGroupWriteInput } from '@/types/menu';
import { ModifierType } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModifierPicker } from './modifier-picker';

interface ModifierGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: ModifierGroup | null;
  modifiers: MenuModifier[];
  recipes: Recipe[];
  onSave: (data: ModifierGroupWriteInput, modifierIds: string[]) => Promise<void>;
}

function clampSelectionCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function ModifierGroupFormDialog({
  open,
  onOpenChange,
  group,
  modifiers,
  recipes,
  onSave,
}: ModifierGroupFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ModifierType>(ModifierType.MULTIPLE);
  const [required, setRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(1);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setName(group?.name ?? '');
    setType(group?.type ?? ModifierType.MULTIPLE);
    setRequired(group?.required ?? false);
    setMinSelections(group?.min_selections ?? 0);
    setMaxSelections(group?.max_selections ?? 1);
    setSelectedModifierIds(group?.modifiers.map((modifier) => modifier.id) ?? []);
    setError(null);
  }, [group, open]);

  const handleTypeChange = (nextType: ModifierType) => {
    setType(nextType);

    if (nextType === ModifierType.SINGLE) {
      setMaxSelections(1);
      setMinSelections(required ? 1 : 0);
    }
  };

  const handleRequiredChange = (checked: boolean | 'indeterminate') => {
    const isRequired = checked === true;
    setRequired(isRequired);

    if (type === ModifierType.SINGLE) {
      setMinSelections(isRequired ? 1 : 0);
      setMaxSelections(1);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nazwa grupy jest wymagana');
      return;
    }

    if (selectedModifierIds.length === 0) {
      setError('Dodaj przynajmniej jeden modyfikator do grupy');
      return;
    }

    const normalizedMinSelections = type === ModifierType.SINGLE
      ? (required ? 1 : 0)
      : clampSelectionCount(minSelections);
    const normalizedMaxSelections = type === ModifierType.SINGLE
      ? 1
      : Math.max(clampSelectionCount(maxSelections), normalizedMinSelections);

    setIsSaving(true);
    setError(null);

    try {
      await onSave(
        {
          id: group?.id ?? crypto.randomUUID(),
          name: name.trim(),
          type,
          required,
          min_selections: normalizedMinSelections,
          max_selections: normalizedMaxSelections,
        },
        selectedModifierIds
      );
      onOpenChange(false);
    } catch {
      setError('Nie udalo sie zapisac grupy modyfikatorow');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = Boolean(group);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-component="modifier-group-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj grupe modyfikatorow' : 'Nowa grupa modyfikatorow'}
          </DialogTitle>
          <DialogDescription>
            Zdefiniuj zasady wyboru i sklad grupy przypisywanej do produktow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="modifier-group-name">Nazwa grupy</Label>
              <Input
                id="modifier-group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Np. Sosy, Dodatki, Wybierz rozmiar"
                data-field="modifier-group-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modifier-group-type">Typ wyboru</Label>
              <Select value={type} onValueChange={(value) => handleTypeChange(value as ModifierType)}>
                <SelectTrigger id="modifier-group-type" data-field="modifier-group-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ModifierType.SINGLE}>Pojedynczy wybor</SelectItem>
                  <SelectItem value={ModifierType.MULTIPLE}>Wielokrotny wybor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label htmlFor="modifier-group-required">Wymagana grupa</Label>
                <p className="text-xs text-muted-foreground">
                  Klient musi wybrac przynajmniej jedna opcje z tej grupy.
                </p>
              </div>
              <Checkbox
                id="modifier-group-required"
                checked={required}
                onCheckedChange={handleRequiredChange}
                data-field="modifier-group-required"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modifier-group-min">Minimalna liczba wyborow</Label>
              <Input
                id="modifier-group-min"
                type="number"
                min="0"
                value={minSelections}
                disabled={type === ModifierType.SINGLE}
                onChange={(event) => setMinSelections(Number(event.target.value) || 0)}
                data-field="modifier-group-min"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modifier-group-max">Maksymalna liczba wyborow</Label>
              <Input
                id="modifier-group-max"
                type="number"
                min="1"
                value={maxSelections}
                disabled={type === ModifierType.SINGLE}
                onChange={(event) => setMaxSelections(Number(event.target.value) || 1)}
                data-field="modifier-group-max"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <h3 className="font-medium">Modyfikatory w grupie</h3>
              <p className="text-sm text-muted-foreground">
                Kolejnosc tutaj bedzie widoczna tak samo na produkcie i w delivery.
              </p>
            </div>
            <ModifierPicker
              allModifiers={modifiers}
              selectedModifierIds={selectedModifierIds}
              onChange={setSelectedModifierIds}
              recipes={recipes}
              allowCreate={false}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="cancel-modifier-group"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-action="save-modifier-group"
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
