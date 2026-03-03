'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { InventoryCategory } from '@/types/inventory';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: InventoryCategory[];
  stockItemCountsByCategory: Record<string, number>;
  onCreateCategory: (
    data: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  onUpdateCategory: (id: string, data: Partial<InventoryCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function InventoryCategoryManager({
  open,
  onOpenChange,
  categories,
  stockItemCountsByCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: InventoryCategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSortOrder, setNewSortOrder] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextSortOrder = useMemo(() => {
    if (categories.length === 0) return 1;
    return Math.max(...categories.map((c) => c.sort_order), 0) + 1;
  }, [categories]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Podaj nazwe kategorii');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateCategory({
        name: newName.trim(),
        description: newDescription.trim() || null,
        sort_order: newSortOrder === '' ? nextSortOrder : newSortOrder,
        is_active: true,
      });
      toast.success(`Utworzono kategorie: ${newName}`);
      setNewName('');
      setNewDescription('');
      setNewSortOrder('');
    } catch {
      toast.error('Nie udalo sie utworzyc kategorii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Podaj nazwe kategorii');
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdateCategory(id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        sort_order: editSortOrder,
      });
      toast.success('Kategoria zaktualizowana');
      setEditingId(null);
    } catch {
      toast.error('Nie udalo sie zaktualizowac kategorii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const count = stockItemCountsByCategory[id] ?? 0;
    if (count > 0) {
      toast.error('Nie mozna usunac kategorii z przypisanymi pozycjami');
      return;
    }
    setIsSubmitting(true);
    try {
      await onDeleteCategory(id);
      toast.success('Kategoria usunieta');
    } catch {
      toast.error('Nie udalo sie usunac kategorii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (category: InventoryCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? '');
    setEditSortOrder(category.sort_order);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-component="inventory-category-manager">
        <DialogHeader>
          <DialogTitle>Zarzadzaj kategoriami produktow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-md border p-3" data-id={category.id}>
                {editingId === category.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      data-field="edit-category-name"
                    />
                    <Textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Opis kategorii (opcjonalnie)"
                      data-field="edit-category-description"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(Number(e.target.value))}
                      data-field="edit-category-sort-order"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(category.id)}
                        disabled={isSubmitting}
                        data-action="save-category"
                      >
                        Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        data-action="cancel-edit-category"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stockItemCountsByCategory[category.id] ?? 0} pozycji • Kolejnosc: {category.sort_order}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(category)}
                      data-action="edit-category"
                      data-id={category.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(category.id)}
                      disabled={(stockItemCountsByCategory[category.id] ?? 0) > 0 || isSubmitting}
                      data-action="delete-category"
                      data-id={category.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Dodaj nowa kategorie</p>
            <div className="space-y-2">
              <Label>Nazwa *</Label>
              <Input
                placeholder="np. Mieso i ryby"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-field="new-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Opis kategorii (opcjonalnie)"
                data-field="new-category-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Kolejnosc</Label>
              <Input
                type="number"
                min={0}
                placeholder={String(nextSortOrder)}
                value={newSortOrder}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewSortOrder(value ? Number(value) : '');
                }}
                data-field="new-category-sort-order"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="close-category-manager"
          >
            Zamknij
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !newName.trim()}
            data-action="create-category"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj kategorie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
