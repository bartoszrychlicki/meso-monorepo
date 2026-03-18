'use client';

import { useMemo, useState } from 'react';
import { ModifierGroup, MenuModifier, ModifierGroupWriteInput } from '@/types/menu';
import { ModifierType } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ModifierGroupFormDialog } from './modifier-group-form-dialog';
import { toast } from 'sonner';

interface ModifierGroupManagementProps {
  groups: ModifierGroup[];
  modifiers: MenuModifier[];
  recipes: Recipe[];
  isLoading: boolean;
  onCreateGroup: (data: ModifierGroupWriteInput, modifierIds: string[]) => Promise<ModifierGroup>;
  onUpdateGroup: (id: string, data: Partial<ModifierGroupWriteInput>, modifierIds: string[]) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

export function ModifierGroupManagement({
  groups,
  modifiers,
  recipes,
  isLoading,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
}: ModifierGroupManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const normalizedQuery = searchQuery.toLowerCase();
    return groups.filter((group) => group.name.toLowerCase().includes(normalizedQuery));
  }, [groups, searchQuery]);

  const handleCreate = () => {
    setEditingGroup(null);
    setFormOpen(true);
  };

  const handleEdit = (group: ModifierGroup) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleSave = async (data: ModifierGroupWriteInput, modifierIds: string[]) => {
    try {
      if (editingGroup) {
        await onUpdateGroup(editingGroup.id, data, modifierIds);
        toast.success('Grupa modyfikatorow zaktualizowana');
      } else {
        await onCreateGroup(data, modifierIds);
        toast.success('Grupa modyfikatorow utworzona');
      }
    } catch (error) {
      toast.error('Blad podczas zapisywania grupy modyfikatorow');
      console.error(error);
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteGroupId) return;

    try {
      await onDeleteGroup(deleteGroupId);
      toast.success('Grupa modyfikatorow usunieta');
    } catch (error) {
      toast.error('Blad podczas usuwania grupy modyfikatorow');
      console.error(error);
    } finally {
      setDeleteGroupId(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div data-component="modifier-group-management" className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Szukaj grupy modyfikatorow..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="max-w-sm"
          data-field="modifier-group-search"
        />
        <Button onClick={handleCreate} data-action="create-modifier-group">
          <Plus className="mr-2 h-4 w-4" />
          Nowa grupa
        </Button>
      </div>

      {groups.length === 0 && !searchQuery ? (
        <EmptyState
          title="Brak grup modyfikatorow"
          description="Dodaj pierwsza grupe, aby przypisywac ja do produktow."
          action={
            <Button onClick={handleCreate} data-action="create-modifier-group">
              <Plus className="mr-2 h-4 w-4" />
              Nowa grupa
            </Button>
          }
        />
      ) : filteredGroups.length === 0 && searchQuery ? (
        <EmptyState
          title="Brak wynikow"
          description={`Nie znaleziono grup modyfikatorow dla "${searchQuery}".`}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Zasady</TableHead>
                <TableHead>Modyfikatory</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id} data-id={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {group.type === ModifierType.SINGLE ? 'Pojedynczy wybor' : 'Wielokrotny wybor'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {group.required ? 'Wymagana' : 'Opcjonalna'} • min {group.min_selections} / max {group.max_selections}
                  </TableCell>
                  <TableCell className="text-sm">
                    {group.modifiers.length}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(group)}
                        data-action="edit-modifier-group"
                        data-id={group.id}
                        aria-label={`Edytuj ${group.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteGroupId(group.id)}
                        data-action="delete-modifier-group"
                        data-id={group.id}
                        aria-label={`Usun ${group.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ModifierGroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editingGroup}
        modifiers={modifiers}
        recipes={recipes}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteGroupId)}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupId(null);
        }}
        title="Usun grupe modyfikatorow"
        description="Czy na pewno chcesz usunac te grupe? Produkty straca to przypisanie."
        confirmLabel="Usun"
        cancelLabel="Anuluj"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}
