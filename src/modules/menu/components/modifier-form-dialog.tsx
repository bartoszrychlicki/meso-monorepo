'use client';

import { useState, useEffect } from 'react';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

interface ModifierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifier?: MenuModifier | null;
  recipes: Recipe[];
  onSave: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export function ModifierFormDialog({
  open,
  onOpenChange,
  modifier,
  recipes,
  onSave,
}: ModifierFormDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [modifierAction, setModifierAction] = useState<ModifierAction>(ModifierAction.ADD);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens with new modifier data
  useEffect(() => {
    if (open) {
      if (modifier) {
        setName(modifier.name);
        setPrice(String(modifier.price));
        setModifierAction(modifier.modifier_action);
        setRecipeId(modifier.recipe_id ?? null);
        setIsAvailable(modifier.is_available);
      } else {
        setName('');
        setPrice('0');
        setModifierAction(ModifierAction.ADD);
        setRecipeId(null);
        setIsAvailable(true);
      }
      setError(null);
    }
  }, [open, modifier]);

  const handleSave = async () => {
    // Validate name
    if (!name.trim()) {
      setError('Nazwa modyfikatora jest wymagana');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      setError('Cena musi byc liczba');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        price: parsedPrice,
        modifier_action: modifierAction,
        recipe_id: recipeId || null,
        is_available: isAvailable,
        sort_order: modifier?.sort_order ?? 0,
      });
      onOpenChange(false);
    } catch {
      setError('Nie udalo sie zapisac modyfikatora');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = !!modifier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-component="modifier-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj modyfikator' : 'Nowy modyfikator'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="modifier-name">Nazwa</Label>
            <Input
              id="modifier-name"
              data-field="modifier-name"
              placeholder="Nazwa modyfikatora"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="modifier-price">+/- PLN</Label>
            <Input
              id="modifier-price"
              data-field="modifier-price"
              type="number"
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Modifier Action */}
          <div className="space-y-2">
            <Label htmlFor="modifier-action">Typ akcji</Label>
            <Select
              value={modifierAction}
              onValueChange={(val) => setModifierAction(val as ModifierAction)}
            >
              <SelectTrigger id="modifier-action" data-field="modifier-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ModifierAction.ADD}>
                  Dodatek (dodaj)
                </SelectItem>
                <SelectItem value={ModifierAction.REMOVE}>
                  Usuniecie (usun)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipe */}
          <div className="space-y-2">
            <Label htmlFor="modifier-recipe">Receptura</Label>
            <Select
              value={recipeId ?? '__none__'}
              onValueChange={(val) =>
                setRecipeId(val === '__none__' ? null : val)
              }
            >
              <SelectTrigger id="modifier-recipe" data-field="modifier-recipe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Brak</SelectItem>
                {recipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available */}
          <div className="flex items-center justify-between">
            <Label htmlFor="modifier-available">Dostepny</Label>
            <Switch
              id="modifier-available"
              data-field="modifier-available"
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
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
            data-action="cancel-modifier"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-action="save-modifier"
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
