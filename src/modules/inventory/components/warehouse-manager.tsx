'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Warehouse } from '@/types/inventory';
import { Location } from '@/types/common';
import { createRepository } from '@/lib/data/repository-factory';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface WarehouseManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  warehouseStockItemCounts: Record<string, number>;
  onCreateWarehouse: (data: { name: string; location_id: string | null; is_active: boolean }) => Promise<void>;
  onUpdateWarehouse: (id: string, data: Partial<Warehouse>) => Promise<void>;
  onDeleteWarehouse: (id: string) => Promise<void>;
}

const locationRepo = createRepository<Location>('locations');

const NONE_LOCATION = '__none__';

export function WarehouseManager({
  open,
  onOpenChange,
  warehouses,
  warehouseStockItemCounts,
  onCreateWarehouse,
  onUpdateWarehouse,
  onDeleteWarehouse,
}: WarehouseManagerProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [newName, setNewName] = useState('');
  const [newLocationId, setNewLocationId] = useState<string>(NONE_LOCATION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationId, setEditLocationId] = useState<string>(NONE_LOCATION);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      locationRepo
        .findMany((loc) => loc.is_active)
        .then(setLocations)
        .catch(() => setLocations([]));
    }
  }, [open]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Podaj nazwe magazynu');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateWarehouse({
        name: newName.trim(),
        location_id: newLocationId === NONE_LOCATION ? null : newLocationId,
        is_active: true,
      });
      toast.success(`Utworzono magazyn: ${newName}`);
      setNewName('');
      setNewLocationId(NONE_LOCATION);
    } catch {
      toast.error('Nie udalo sie utworzyc magazynu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Podaj nazwe magazynu');
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdateWarehouse(id, {
        name: editName.trim(),
        location_id: editLocationId === NONE_LOCATION ? null : editLocationId,
      });
      toast.success('Magazyn zaktualizowany');
      setEditingId(null);
    } catch {
      toast.error('Nie udalo sie zaktualizowac magazynu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const count = warehouseStockItemCounts[id] ?? 0;
    if (count > 0) {
      toast.error('Nie mozna usunac magazynu z przypisanymi pozycjami');
      return;
    }
    setIsSubmitting(true);
    try {
      await onDeleteWarehouse(id);
      toast.success('Magazyn usuniety');
    } catch {
      toast.error('Nie udalo sie usunac magazynu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setEditName(warehouse.name);
    setEditLocationId(warehouse.location_id ?? NONE_LOCATION);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-component="warehouse-manager">
        <DialogHeader>
          <DialogTitle>Zarzadzaj magazynami</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {warehouses.map((w) => (
              <div key={w.id} className="flex items-center gap-2 rounded-md border p-3" data-id={w.id}>
                {editingId === w.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      data-field="edit-warehouse-name"
                    />
                    <Select value={editLocationId} onValueChange={setEditLocationId}>
                      <SelectTrigger data-field="edit-warehouse-location">
                        <SelectValue placeholder="Bez lokalizacji" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_LOCATION}>Bez lokalizacji</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(w.id)}
                        disabled={isSubmitting}
                        data-action="save-warehouse"
                      >
                        Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        data-action="cancel-edit-warehouse"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {warehouseStockItemCounts[w.id] ?? 0} pozycji
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(w)}
                      data-action="edit-warehouse"
                      data-id={w.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(w.id)}
                      disabled={(warehouseStockItemCounts[w.id] ?? 0) > 0 || isSubmitting}
                      data-action="delete-warehouse"
                      data-id={w.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Dodaj nowy magazyn</p>
            <div className="space-y-2">
              <Label>Nazwa *</Label>
              <Input
                placeholder="np. Magazyn mokry"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-field="new-warehouse-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Lokalizacja (opcjonalnie)</Label>
              <Select value={newLocationId} onValueChange={setNewLocationId}>
                <SelectTrigger data-field="new-warehouse-location">
                  <SelectValue placeholder="Bez lokalizacji" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_LOCATION}>Bez lokalizacji</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action="close-warehouse-manager"
          >
            Zamknij
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !newName.trim()}
            data-action="create-warehouse"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj magazyn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
