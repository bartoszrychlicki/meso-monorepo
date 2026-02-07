'use client';

import { useState, useEffect } from 'react';
import { Warehouse } from '@/types/inventory';
import { WarehouseType } from '@/types/enums';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
  onSave: (data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  locationId: string;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
  onSave,
  locationId,
}: WarehouseFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WarehouseType>(WarehouseType.CENTRAL);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name);
      setType(warehouse.type);
      setIsActive(warehouse.is_active);
    } else {
      setName('');
      setType(WarehouseType.CENTRAL);
      setIsActive(true);
    }
  }, [warehouse, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name,
        type,
        location_id: locationId,
        is_active: isActive,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: WarehouseType) => {
    const labels: Record<WarehouseType, string> = {
      [WarehouseType.CENTRAL]: 'Centralny (Kuchnia Centralna)',
      [WarehouseType.POINT]: 'Punkt sprzedaży',
      [WarehouseType.STORAGE]: 'Magazyn składowy',
    };
    return labels[type];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {warehouse ? 'Edytuj magazyn' : 'Nowy magazyn'}
            </DialogTitle>
            <DialogDescription>
              {warehouse
                ? 'Zmień dane magazynu'
                : 'Dodaj nowy magazyn do systemu'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa magazynu *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Magazyn Główny, Food Truck Mokotów"
                required
                data-field="warehouse-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Typ magazynu</Label>
              <Select value={type} onValueChange={(v) => setType(v as WarehouseType)}>
                <SelectTrigger id="type" data-field="warehouse-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(WarehouseType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {getTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Magazyn aktywny</Label>
                <p className="text-sm text-muted-foreground">
                  Czy magazyn jest obecnie używany
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
                data-field="warehouse-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Zapisywanie...' : warehouse ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
