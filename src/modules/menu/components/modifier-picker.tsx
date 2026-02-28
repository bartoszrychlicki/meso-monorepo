'use client';

import { useState } from 'react';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ModifierFormDialog } from './modifier-form-dialog';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface ModifierPickerProps {
  allModifiers: MenuModifier[];
  selectedModifierIds: string[];
  onChange: (ids: string[]) => void;
  recipes: Recipe[];
  onCreateModifier: (
    data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<MenuModifier>;
}

export function ModifierPicker({
  allModifiers,
  selectedModifierIds,
  onChange,
  recipes,
  onCreateModifier,
}: ModifierPickerProps) {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = allModifiers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (modifierId: string) => {
    if (selectedModifierIds.includes(modifierId)) {
      onChange(selectedModifierIds.filter((id) => id !== modifierId));
    } else {
      onChange([...selectedModifierIds, modifierId]);
    }
  };

  const handleCreateModifier = async (
    data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const newModifier = await onCreateModifier(data);
    // Auto-select the newly created modifier
    onChange([...selectedModifierIds, newModifier.id]);
  };

  return (
    <div className="space-y-3" data-component="modifier-picker">
      {/* Search input */}
      <Input
        placeholder="Szukaj modyfikatora..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-field="modifier-search"
      />

      {/* Scrollable list */}
      <div className="max-h-64 overflow-auto space-y-1 rounded-lg border p-2">
        {filtered.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Brak modyfikatorow
          </div>
        ) : (
          filtered.map((modifier) => {
            const isSelected = selectedModifierIds.includes(modifier.id);
            return (
              <div
                key={modifier.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                data-id={modifier.id}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(modifier.id)}
                  data-action="toggle-modifier"
                  aria-label={`Toggle ${modifier.name}`}
                />
                <span className="flex-1 text-sm font-medium">
                  {modifier.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {modifier.price > 0
                    ? `+${formatCurrency(modifier.price)}`
                    : modifier.price < 0
                    ? formatCurrency(modifier.price)
                    : 'bezplatnie'}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs"
                >
                  {modifier.modifier_action === ModifierAction.ADD
                    ? 'Dodatek'
                    : modifier.modifier_action === ModifierAction.REMOVE
                    ? 'Usuniecie'
                    : modifier.modifier_action}
                </Badge>
              </div>
            );
          })
        )}
      </div>

      {/* Create new modifier button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        data-action="create-modifier"
      >
        <Plus className="mr-1 h-4 w-4" />
        Stworz nowy modyfikator
      </Button>

      {/* Modifier creation dialog */}
      <ModifierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipes={recipes}
        onSave={handleCreateModifier}
      />
    </div>
  );
}
