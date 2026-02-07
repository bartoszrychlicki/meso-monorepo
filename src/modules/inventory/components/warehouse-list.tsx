'use client';

import { Warehouse } from '@/types/inventory';
import { WarehouseType } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';

interface WarehouseListProps {
  warehouses: Warehouse[];
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (warehouse: Warehouse) => void;
}

const getTypeLabel = (type: WarehouseType) => {
  const labels: Record<WarehouseType, string> = {
    [WarehouseType.CENTRAL]: 'Centralny (KC)',
    [WarehouseType.POINT]: 'Punkt sprzedaży',
    [WarehouseType.STORAGE]: 'Magazyn składowy',
  };
  return labels[type];
};

const getTypeBadgeVariant = (type: WarehouseType) => {
  switch (type) {
    case WarehouseType.CENTRAL:
      return 'default';
    case WarehouseType.POINT:
      return 'secondary';
    case WarehouseType.STORAGE:
      return 'outline';
    default:
      return 'outline';
  }
};

export function WarehouseList({ warehouses, onEdit, onDelete }: WarehouseListProps) {
  if (warehouses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        <WarehouseIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="font-medium mb-1">Brak magazynów</p>
        <p>Dodaj pierwszy magazyn aby rozpocząć zarządzanie stanami</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-component="warehouse-list">
      {warehouses.map((warehouse) => (
        <Card
          key={warehouse.id}
          className={!warehouse.is_active ? 'opacity-60' : ''}
          data-warehouse-id={warehouse.id}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base font-medium">
                  {warehouse.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getTypeBadgeVariant(warehouse.type)}>
                    {getTypeLabel(warehouse.type)}
                  </Badge>
                  {!warehouse.is_active && (
                    <Badge variant="destructive">Nieaktywny</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(warehouse)}
                data-action="edit-warehouse"
                className="flex-1"
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edytuj
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(warehouse)}
                data-action="delete-warehouse"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
