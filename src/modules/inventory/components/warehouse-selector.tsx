'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse } from '@/types/inventory';
import { Warehouse as WarehouseIcon } from 'lucide-react';

interface WarehouseSelectorProps {
  warehouses: Warehouse[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function WarehouseSelector({
  warehouses,
  selectedId,
  onSelect,
}: WarehouseSelectorProps) {
  return (
    <Tabs
      value={selectedId ?? 'all'}
      onValueChange={(val) => onSelect(val === 'all' ? null : val)}
      data-component="warehouse-selector"
    >
      <TabsList>
        <TabsTrigger value="all" data-action="select-warehouse" data-id="all">
          <WarehouseIcon className="mr-1.5 h-4 w-4" />
          Wszystkie
        </TabsTrigger>
        {warehouses.map((w) => (
          <TabsTrigger
            key={w.id}
            value={w.id}
            data-action="select-warehouse"
            data-id={w.id}
          >
            {w.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
