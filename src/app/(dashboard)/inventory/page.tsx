'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { StockTable } from '@/modules/inventory/components/stock-table';
import { StockAlertCard } from '@/modules/inventory/components/stock-alert-card';
import { StockItemForm } from '@/modules/inventory/components/stock-item-form';
import { WarehouseSelector } from '@/modules/inventory/components/warehouse-selector';
import { useInventoryStore } from '@/modules/inventory/store';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Package, AlertTriangle, DollarSign, Plus } from 'lucide-react';

export default function InventoryPage() {
  const {
    warehouses,
    stockItems,
    selectedWarehouseId,
    isLoading,
    loadWarehouses,
    loadStockItems,
    adjustStock,
    createStockItem,
    setSelectedWarehouse,
    getLowStockItems,
    getStockValue,
    filteredItems,
  } = useInventoryStore();

  const [showNewItemForm, setShowNewItemForm] = useState(false);

  useEffect(() => {
    loadWarehouses();
    loadStockItems();
  }, [loadWarehouses, loadStockItems]);

  const lowStockItems = getLowStockItems();
  const stockValue = getStockValue();
  const displayItems = filteredItems();

  if (isLoading && stockItems.length === 0) {
    return (
      <div className="space-y-6" data-page="inventory">
        <PageHeader title="Magazyn" description="Stany magazynowe i alerty" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="inventory">
      <PageHeader
        title="Magazyn"
        description="Stany magazynowe i alerty"
        actions={
          <Button
            onClick={() => setShowNewItemForm(true)}
            data-action="add-stock-item"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nowa pozycja
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          label="Pozycji lacznie"
          value={stockItems.length}
          className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Niski stan"
          value={lowStockItems.length}
          className={lowStockItems.length > 0
            ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20'
            : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
          }
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Wartosc magazynu"
          value={formatCurrency(stockValue)}
          className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
        />
      </div>

      <WarehouseSelector
        warehouses={warehouses}
        selectedId={selectedWarehouseId}
        onSelect={setSelectedWarehouse}
      />

      <StockAlertCard lowStockItems={lowStockItems} />

      <StockTable
        items={displayItems}
        warehouses={warehouses}
        onAdjustStock={async (itemId, quantity, reason) => {
          await adjustStock(itemId, quantity, reason);
        }}
      />

      <StockItemForm
        open={showNewItemForm}
        onOpenChange={setShowNewItemForm}
        warehouses={warehouses}
        onSubmit={async (data) => {
          await createStockItem(data);
        }}
      />
    </div>
  );
}
