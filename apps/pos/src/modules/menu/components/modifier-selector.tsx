'use client';

import { ModifierGroup, Modifier } from '@/types/menu';
import { ModifierType, ModifierAction } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface ModifierSelectorProps {
  modifierGroups: ModifierGroup[];
  onChange: (groups: ModifierGroup[]) => void;
}

export function ModifierSelector({ modifierGroups, onChange }: ModifierSelectorProps) {
  const addGroup = () => {
    const newGroup: ModifierGroup = {
      id: crypto.randomUUID(),
      name: '',
      type: ModifierType.MULTIPLE,
      required: false,
      min_selections: 0,
      max_selections: 5,
      modifiers: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...modifierGroups, newGroup]);
  };

  const removeGroup = (groupId: string) => {
    onChange(modifierGroups.filter((g) => g.id !== groupId));
  };

  const updateGroup = (groupId: string, updates: Partial<ModifierGroup>) => {
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
      )
    );
  };

  const addModifier = (groupId: string) => {
    const newModifier: Modifier = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      is_available: true,
      sort_order: 0,
      modifier_action: ModifierAction.ADD,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId
          ? { ...g, modifiers: [...g.modifiers, newModifier], updated_at: new Date().toISOString() }
          : g
      )
    );
  };

  const removeModifier = (groupId: string, modifierId: string) => {
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              modifiers: g.modifiers.filter((m) => m.id !== modifierId),
              updated_at: new Date().toISOString(),
            }
          : g
      )
    );
  };

  const updateModifier = (groupId: string, modifierId: string, updates: Partial<Modifier>) => {
    onChange(
      modifierGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              modifiers: g.modifiers.map((m) =>
                m.id === modifierId ? { ...m, ...updates } : m
              ),
              updated_at: new Date().toISOString(),
            }
          : g
      )
    );
  };

  return (
    <div className="space-y-4" data-component="modifier-selector">
      {modifierGroups.map((group) => (
        <Card key={group.id} className="py-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={group.name}
                  onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                  placeholder="Nazwa grupy modyfikatorow..."
                  className="h-8 w-56 font-medium"
                  data-field="modifier-group-name"
                />
                <Select
                  value={group.type}
                  onValueChange={(v) => updateGroup(group.id, { type: v as ModifierType })}
                >
                  <SelectTrigger className="h-8 w-40" data-field="modifier-group-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ModifierType.SINGLE}>
                      Pojedynczy wybór
                    </SelectItem>
                    <SelectItem value={ModifierType.MULTIPLE}>
                      Wielokrotny wybór
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeGroup(group.id)}
                className="text-destructive hover:text-destructive"
                data-action="remove-modifier-group"
                data-id={group.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.modifiers.map((modifier) => (
              <div key={modifier.id} className="flex items-center gap-2">
                <Input
                  value={modifier.name}
                  onChange={(e) =>
                    updateModifier(group.id, modifier.id, { name: e.target.value })
                  }
                  placeholder="Nazwa modyfikatora (np. Dodatkowe jajko)"
                  className="h-8 flex-1"
                  data-field="modifier-name"
                />
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">+/- PLN:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={modifier.price}
                    onChange={(e) =>
                      updateModifier(group.id, modifier.id, {
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="h-8 w-24"
                    data-field="modifier-price"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeModifier(group.id, modifier.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  data-action="remove-modifier"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addModifier(group.id)}
              className="w-full"
              data-action="add-modifier"
              data-id={group.id}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Dodaj modyfikator
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={addGroup}
        className="w-full"
        data-action="add-modifier-group"
      >
        <Plus className="mr-2 h-4 w-4" />
        Dodaj grupe modyfikatorow
      </Button>
    </div>
  );
}
