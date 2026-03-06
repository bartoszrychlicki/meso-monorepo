'use client';

import { useState, useEffect } from 'react';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { DecimalInput } from '@/components/ui/decimal-input';

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
  const [price, setPrice] = useState<number | null>(0);
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
        setPrice(modifier.price);
        setModifierAction(modifier.modifier_action);
        setRecipeId(modifier.recipe_id ?? null);
        setIsAvailable(modifier.is_available);
      } else {
        setName('');
        setPrice(0);
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

    if (price == null) {
      setError('Cena musi byc liczba');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        price,
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
          <DialogDescription>
            Skonfiguruj nazwe, cene i typ akcji modyfikatora.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
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
              <Label htmlFor="modifier-price" className="flex items-center gap-1">
                +/- PLN
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Wartosc dodatnia = doplata, ujemna = rabat, 0 = bezplatnie
                  </TooltipContent>
                </Tooltip>
              </Label>
              <DecimalInput
                id="modifier-price"
                data-field="modifier-price"
                allowNegative
                value={price}
                onChange={setPrice}
              />
            </div>

            {/* Modifier Action */}
            <div className="space-y-2">
              <Label htmlFor="modifier-action" className="flex items-center gap-1">
                Typ akcji
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Dodatek = dodaje skladnik/pozycje, Usuniecie = usuwa z bazowego produktu
                  </TooltipContent>
                </Tooltip>
              </Label>
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
              <Label htmlFor="modifier-recipe" className="flex items-center gap-1">
                Receptura
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Powiaz modyfikator z receptura, aby sledzic koszty skladnikow
                  </TooltipContent>
                </Tooltip>
              </Label>
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
              <Label htmlFor="modifier-available" className="flex items-center gap-1">
                Dostepny
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Okresla, czy modyfikator jest widoczny i dostepny w POS
                  </TooltipContent>
                </Tooltip>
              </Label>
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
        </TooltipProvider>

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
