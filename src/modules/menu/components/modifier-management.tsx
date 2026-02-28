'use client';

import { useState, useMemo } from 'react';
import { MenuModifier } from '@/types/menu';
import { ModifierAction } from '@/types/enums';
import { Recipe } from '@/types/recipe';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ModifierFormDialog } from './modifier-form-dialog';

interface ModifierManagementProps {
  modifiers: MenuModifier[];
  recipes: Recipe[];
  isLoading: boolean;
  onCreateModifier: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
  onUpdateModifier: (id: string, data: Partial<MenuModifier>) => Promise<void>;
  onDeleteModifier: (id: string) => Promise<void>;
}

export function ModifierManagement({
  modifiers,
  recipes,
  isLoading,
  onCreateModifier,
  onUpdateModifier,
  onDeleteModifier,
}: ModifierManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingModifier, setEditingModifier] = useState<MenuModifier | null>(null);
  const [deleteModifierId, setDeleteModifierId] = useState<string | null>(null);

  const filteredModifiers = useMemo(() => {
    if (!searchQuery.trim()) return modifiers;
    const lq = searchQuery.toLowerCase();
    return modifiers.filter((m) => m.name.toLowerCase().includes(lq));
  }, [modifiers, searchQuery]);

  const recipesMap = useMemo(() => {
    const map = new Map<string, string>();
    recipes.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [recipes]);

  const handleCreate = () => {
    setEditingModifier(null);
    setFormOpen(true);
  };

  const handleEdit = (modifier: MenuModifier) => {
    setEditingModifier(modifier);
    setFormOpen(true);
  };

  const handleSave = async (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingModifier) {
      await onUpdateModifier(editingModifier.id, data);
    } else {
      await onCreateModifier(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteModifierId) {
      await onDeleteModifier(deleteModifierId);
      setDeleteModifierId(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div data-component="modifier-management" className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Szukaj modyfikatora..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
          data-field="modifier-search"
        />
        <Button
          onClick={handleCreate}
          data-action="create-modifier"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nowy modyfikator
        </Button>
      </div>

      {/* Content */}
      {modifiers.length === 0 && !searchQuery ? (
        <EmptyState
          title="Brak modyfikatorow"
          description="Dodaj pierwszy modyfikator, aby moc go przypisywac do produktow."
          action={
            <Button onClick={handleCreate} data-action="create-modifier">
              <Plus className="mr-2 h-4 w-4" />
              Nowy modyfikator
            </Button>
          }
        />
      ) : filteredModifiers.length === 0 && searchQuery ? (
        <EmptyState
          title="Brak wynikow"
          description={`Nie znaleziono modyfikatorow dla "${searchQuery}".`}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Cena</TableHead>
                <TableHead>Akcja</TableHead>
                <TableHead>Receptura</TableHead>
                <TableHead>Dostepnosc</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModifiers.map((modifier) => (
                <TableRow key={modifier.id} data-id={modifier.id}>
                  <TableCell className="font-medium">{modifier.name}</TableCell>
                  <TableCell>{formatCurrency(modifier.price)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={modifier.modifier_action === ModifierAction.ADD ? 'default' : 'secondary'}
                    >
                      {modifier.modifier_action === ModifierAction.ADD
                        ? 'Dodatek'
                        : 'Usuniecie'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {modifier.recipe_id
                      ? recipesMap.get(modifier.recipe_id) ?? '\u2013'
                      : '\u2013'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={modifier.is_available ? 'default' : 'secondary'}
                      className={modifier.is_available ? 'bg-green-600' : 'bg-gray-400'}
                    >
                      {modifier.is_available ? 'Dostepny' : 'Niedostepny'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(modifier)}
                        data-action="edit-modifier"
                        data-id={modifier.id}
                        aria-label={`Edytuj ${modifier.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteModifierId(modifier.id)}
                        data-action="delete-modifier"
                        data-id={modifier.id}
                        aria-label={`Usun ${modifier.name}`}
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

      {/* Form dialog */}
      <ModifierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        modifier={editingModifier}
        recipes={recipes}
        onSave={handleSave}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteModifierId}
        onOpenChange={(open) => {
          if (!open) setDeleteModifierId(null);
        }}
        title="Usun modyfikator"
        description="Czy na pewno chcesz usunac ten modyfikator? Tej operacji nie mozna cofnac."
        confirmLabel="Usun"
        cancelLabel="Anuluj"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}
