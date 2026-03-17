'use client';

import { useMemo, useState } from 'react';
import { ModifierGroup } from '@/types/menu';
import { ModifierType } from '@/types/enums';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface ModifierGroupPickerProps {
  groups: ModifierGroup[];
  selectedGroupIds: string[];
  onChange: (ids: string[]) => void;
}

function normalizeGroupIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function ModifierGroupPicker({
  groups,
  selectedGroupIds,
  onChange,
}: ModifierGroupPickerProps) {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    const matchingGroups = groups.filter((group) =>
      group.name.toLowerCase().includes(search.toLowerCase())
    );
    const selectedGroups = matchingGroups
      .filter((group) => selectedGroupIds.includes(group.id))
      .sort((left, right) => selectedGroupIds.indexOf(left.id) - selectedGroupIds.indexOf(right.id));
    const unselectedGroups = matchingGroups.filter((group) => !selectedGroupIds.includes(group.id));
    return [...selectedGroups, ...unselectedGroups];
  }, [groups, search, selectedGroupIds]);

  const handleToggle = (groupId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      onChange(normalizeGroupIds([...selectedGroupIds, groupId]));
      return;
    }

    onChange(selectedGroupIds.filter((id) => id !== groupId));
  };

  const handleMove = (groupId: string, direction: 'up' | 'down') => {
    const index = selectedGroupIds.indexOf(groupId);
    if (index === -1) return;

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= selectedGroupIds.length) return;

    const nextGroupIds = [...selectedGroupIds];
    [nextGroupIds[index], nextGroupIds[nextIndex]] = [nextGroupIds[nextIndex], nextGroupIds[index]];
    onChange(nextGroupIds);
  };

  return (
    <div className="space-y-3" data-component="modifier-group-picker">
      <Input
        placeholder="Szukaj grupy modyfikatorow..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        data-field="modifier-group-search"
      />

      <div className="max-h-64 space-y-1 overflow-auto rounded-lg border p-2">
        {filteredGroups.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Brak grup modyfikatorow
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroupIds.includes(group.id);
            const selectedIndex = selectedGroupIds.indexOf(group.id);

            return (
              <div
                key={group.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                data-id={group.id}
              >
                {isSelected && (
                  <div className="flex flex-col items-center gap-0.5">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={selectedIndex === 0}
                      onClick={() => handleMove(group.id, 'up')}
                      data-action="move-modifier-group-up"
                      aria-label={`Move ${group.name} up`}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={selectedIndex === selectedGroupIds.length - 1}
                      onClick={() => handleMove(group.id, 'down')}
                      data-action="move-modifier-group-down"
                      aria-label={`Move ${group.name} down`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(group.id, checked)}
                  data-action="toggle-modifier-group"
                  aria-label={`Toggle ${group.name}`}
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.modifiers.length} modyfikatorow • min {group.min_selections} / max {group.max_selections}
                  </div>
                </div>

                <Badge variant="outline" className="text-xs">
                  {group.type === ModifierType.SINGLE ? 'Pojedynczy wybor' : 'Wielokrotny wybor'}
                </Badge>
                {group.required && (
                  <Badge variant="secondary" className="text-xs">
                    Wymagana
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
