'use client';

import { useState, useMemo } from 'react';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ModifierFormDialog } from './modifier-form-dialog';
import { formatCurrency } from '@/lib/utils';
import { Plus, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

interface ModifierPickerProps {
  allModifiers: MenuModifier[];
  selectedModifierIds: string[];
  onChange: (ids: string[]) => void;
  recipes: Recipe[];
  onCreateModifier: (
    data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<MenuModifier>;
}

function normalizeModifierIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
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

  const filtered = useMemo(() => {
    const matching = allModifiers.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
    const selected = matching
      .filter((m) => selectedModifierIds.includes(m.id))
      .sort((a, b) => selectedModifierIds.indexOf(a.id) - selectedModifierIds.indexOf(b.id));
    const unselected = matching.filter((m) => !selectedModifierIds.includes(m.id));
    return [...selected, ...unselected];
  }, [allModifiers, search, selectedModifierIds]);

  const handleToggle = (modifierId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      onChange(normalizeModifierIds([...selectedModifierIds, modifierId]));
    } else {
      onChange(selectedModifierIds.filter((id) => id !== modifierId));
    }
  };

  const handleMove = (modifierId: string, direction: 'up' | 'down') => {
    const idx = selectedModifierIds.indexOf(modifierId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= selectedModifierIds.length) return;
    const newIds = [...selectedModifierIds];
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    onChange(newIds);
  };

  const handleCreateModifier = async (
    data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const newModifier = await onCreateModifier(data);
    // Auto-select the newly created modifier
    onChange(normalizeModifierIds([...selectedModifierIds, newModifier.id]));
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
            const selectedIdx = selectedModifierIds.indexOf(modifier.id);
            return (
              <div
                key={modifier.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                data-id={modifier.id}
              >
                {isSelected && (
                  <div className="flex flex-col items-center gap-0.5">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={selectedIdx === 0}
                      onClick={() => handleMove(modifier.id, 'up')}
                      data-action="move-modifier-up"
                      aria-label={`Move ${modifier.name} up`}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={selectedIdx === selectedModifierIds.length - 1}
                      onClick={() => handleMove(modifier.id, 'down')}
                      data-action="move-modifier-down"
                      aria-label={`Move ${modifier.name} down`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(modifier.id, checked)}
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
