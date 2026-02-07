'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { WarehouseList } from '@/modules/inventory/components/warehouse-list';
import { WarehouseFormDialog } from '@/modules/inventory/components/warehouse-form-dialog';
import { WarehouseDeleteDialog } from '@/modules/inventory/components/warehouse-delete-dialog';
import { useInventoryStore } from '@/modules/inventory/store';
import { Warehouse } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function WarehousesPage() {
  const {
    warehouses,
    stockItems,
    loadWarehouses,
    loadStockItems,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  } = useInventoryStore();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    loadWarehouses();
    loadStockItems();
  }, [loadWarehouses, loadStockItems]);

  const handleAddWarehouse = () => {
    setSelectedWarehouse(null);
    setFormOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormOpen(true);
  };

  const handleDeleteWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setDeleteDialogOpen(true);
  };

  const handleSaveWarehouse = async (
    data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      if (selectedWarehouse) {
        await updateWarehouse(selectedWarehouse.id, data);
        toast.success('Magazyn zaktualizowany pomyślnie');
      } else {
        await createWarehouse(data);
        toast.success('Magazyn utworzony pomyślnie');
      }
      setFormOpen(false);
    } catch (error) {
      toast.error('Błąd podczas zapisywania magazynu');
      console.error(error);
    }
  };

  const handleConfirmDelete = async (transferToWarehouseId?: string) => {
    if (!selectedWarehouse) return;

    try {
      await deleteWarehouse(selectedWarehouse.id, transferToWarehouseId);
      toast.success('Magazyn usunięty pomyślnie');
      setDeleteDialogOpen(false);
      setSelectedWarehouse(null);
    } catch (error) {
      toast.error('Błąd podczas usuwania magazynu');
      console.error(error);
    }
  };

  // Get default location ID (first warehouse's location or empty string)
  const defaultLocationId = warehouses.length > 0 ? warehouses[0].location_id : '';

  return (
    <div className="space-y-6" data-page="warehouses">
      <PageHeader
        title="Zarządzanie magazynami"
        description="Dodawaj, edytuj i usuwaj magazyny w systemie"
        actions={
          <Button onClick={handleAddWarehouse} data-action="add-warehouse">
            <Plus className="mr-2 h-4 w-4" />
            Nowy magazyn
          </Button>
        }
      />

      <WarehouseList
        warehouses={warehouses}
        onEdit={handleEditWarehouse}
        onDelete={handleDeleteWarehouse}
      />

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouse={selectedWarehouse}
        onSave={handleSaveWarehouse}
        locationId={defaultLocationId}
      />

      <WarehouseDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        warehouse={selectedWarehouse}
        warehouses={warehouses}
        stockItems={stockItems}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
