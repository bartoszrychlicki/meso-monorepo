'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { StockTable } from '@/modules/inventory/components/stock-table';
import { StockItemForm } from '@/modules/inventory/components/stock-item-form';
import { TransferDialog } from '@/modules/inventory/components/transfer-dialog';
import { WarehouseManager } from '@/modules/inventory/components/warehouse-manager';
import { InventoryCategoryManager } from '@/modules/inventory/components/inventory-category-manager';
import { InventoryCountCreateDialog } from '@/modules/inventory/components/inventory-count-create-dialog';
import { InventoryCountsTable } from '@/modules/inventory/components/inventory-counts-table';
import { useInventoryStore } from '@/modules/inventory/store';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  Plus,
  ArrowLeftRight,
  Settings,
  Search,
  Tags,
  MoreHorizontal,
} from 'lucide-react';

const ALL_CATEGORIES = '__all__';
const UNCATEGORIZED = '__uncategorized__';

export default function InventoryPage() {
  const router = useRouter();
  const {
    stockItems,
    inventoryCategories,
    warehouses,
    warehouseStockItems,
    inventoryCounts,
    isLoading,
    loadError,
    loadAll,
    adjustStock,
    createStockItem,
    deleteStockItem,
    assignToWarehouse,
    transferStock,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    setDefaultWarehouse,
    createInventoryCategory,
    updateInventoryCategory,
    deleteInventoryCategory,
    createInventoryCount,
    selectedWarehouseId,
    setSelectedWarehouse,
  } = useInventoryStore();

  const [activeView, setActiveView] = useState<'stock' | 'counts'>('stock');
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showWarehouseManager, setShowWarehouseManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCreateCountDialog, setShowCreateCountDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const currentItems = useMemo(() => {
    if (!selectedWarehouseId) return warehouseStockItems;
    return warehouseStockItems.filter((item) => item.warehouse_id === selectedWarehouseId);
  }, [warehouseStockItems, selectedWarehouseId]);

  const filteredItems = useMemo(() => {
    let filtered = currentItems;

    if (categoryFilter !== ALL_CATEGORIES) {
      filtered = filtered.filter((item) => {
        if (categoryFilter === UNCATEGORIZED) return !item.inventory_category_id;
        return item.inventory_category_id === categoryFilter;
      });
    }

    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
    );
  }, [currentItems, searchQuery, categoryFilter]);

  const lowStockItems = useMemo(() => {
    return currentItems.filter((item) => item.is_active && item.quantity < item.min_quantity);
  }, [currentItems]);

  const stockValue = useMemo(() => {
    return currentItems.reduce((total, item) => total + item.quantity * item.cost_per_unit, 0);
  }, [currentItems]);

  const warehouseStockCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of warehouseStockItems) {
      counts[item.warehouse_id] = (counts[item.warehouse_id] ?? 0) + 1;
    }
    return counts;
  }, [warehouseStockItems]);

  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of stockItems) {
      const categoryId = item.inventory_category_id;
      if (!categoryId) continue;
      counts[categoryId] = (counts[categoryId] ?? 0) + 1;
    }
    return counts;
  }, [stockItems]);

  const handleTabChange = (value: string) => {
    setSelectedWarehouse(value === 'all' ? null : value);
  };

  if (isLoading && warehouseStockItems.length === 0) {
    return (
      <div className="space-y-6" data-page="inventory">
        <PageHeader title="Magazyn" description="Stany magazynowe" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="inventory">
      <PageHeader
        title="Magazyn"
        description={activeView === 'stock' ? 'Stany magazynowe' : 'Dokumenty inwentaryzacji'}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            {activeView === 'stock' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowTransferDialog(true)}
                  data-action="transfer-stock"
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
                <Button
                  onClick={() => setShowNewItemForm(true)}
                  data-action="add-stock-item"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nowa pozycja
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-action="inventory-more-actions">
                      <MoreHorizontal className="mr-2 h-4 w-4" />
                      Wiecej
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowWarehouseManager(true)}
                      data-action="manage-warehouses"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Zarzadzaj magazynami
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowCategoryManager(true)}
                      data-action="manage-inventory-categories"
                    >
                      <Tags className="mr-2 h-4 w-4" />
                      Zarzadzaj kategoriami
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
            <Button
              onClick={() => setShowCreateCountDialog(true)}
              data-action="add-inventory-count"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Nowa inwentaryzacja
            </Button>
          </div>
        }
      />

      {loadError ? (
        <Alert variant="destructive" data-status="inventory-load-warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Niepelne dane magazynu</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void loadAll()}
              data-action="retry-inventory-load"
            >
              Sprobuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as 'stock' | 'counts')}
        data-component="inventory-view-tabs"
      >
        <TabsList>
          <TabsTrigger value="stock">Stany</TabsTrigger>
          <TabsTrigger value="counts">Inwentaryzacje</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <KpiCard
              icon={<Package className="h-5 w-5" />}
              label="Pozycji lacznie"
              value={currentItems.length}
              compact
              className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20"
            />
            <KpiCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Niski stan"
              value={lowStockItems.length}
              compact
              className={lowStockItems.length > 0
                ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20'
                : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
              }
            />
            <KpiCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Wartosc magazynu"
              value={formatCurrency(stockValue)}
              compact
              className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="relative" data-component="stock-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj produktu po nazwie lub SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-field="stock-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-field="stock-category-filter">
                <SelectValue placeholder="Wszystkie kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Wszystkie kategorie</SelectItem>
                <SelectItem value={UNCATEGORIZED}>Bez kategorii</SelectItem>
                {inventoryCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={selectedWarehouseId ?? 'all'}
            onValueChange={handleTabChange}
            data-component="warehouse-tabs"
          >
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex min-w-max">
                <TabsTrigger value="all" data-value="all" className="shrink-0">
                  Wszystkie
                </TabsTrigger>
                {warehouses.map((warehouse) => (
                  <TabsTrigger
                    key={warehouse.id}
                    value={warehouse.id}
                    data-value={warehouse.id}
                    className="shrink-0"
                  >
                    {warehouse.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="all">
              <StockTable
                items={filteredItems}
                showWarehouseColumn
                onAdjustStock={async (warehouseId, stockItemId, quantity, reason) => {
                  await adjustStock(warehouseId, stockItemId, quantity, reason);
                }}
                onDeleteStockItem={deleteStockItem}
              />
            </TabsContent>
            {warehouses.map((warehouse) => (
              <TabsContent key={warehouse.id} value={warehouse.id}>
                <StockTable
                  items={filteredItems}
                  onAdjustStock={async (warehouseId, stockItemId, quantity, reason) => {
                    await adjustStock(warehouseId, stockItemId, quantity, reason);
                  }}
                  onDeleteStockItem={deleteStockItem}
                />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="counts">
          <InventoryCountsTable counts={inventoryCounts} />
        </TabsContent>
      </Tabs>

      <StockItemForm
        open={showNewItemForm}
        onOpenChange={setShowNewItemForm}
        warehouses={warehouses}
        inventoryCategories={inventoryCategories}
        onSubmit={async (data, warehouseId, quantity, minQuantity) => {
          const newItem = await createStockItem(data);
          await assignToWarehouse(warehouseId, newItem.id, quantity, minQuantity);
        }}
      />

      <TransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        warehouses={warehouses}
        warehouseStockItems={warehouseStockItems}
        onTransfer={transferStock}
      />

      <WarehouseManager
        open={showWarehouseManager}
        onOpenChange={setShowWarehouseManager}
        warehouses={warehouses}
        warehouseStockItemCounts={warehouseStockCounts}
        onCreateWarehouse={createWarehouse}
        onUpdateWarehouse={updateWarehouse}
        onDeleteWarehouse={deleteWarehouse}
        onSetDefaultWarehouse={setDefaultWarehouse}
      />

      <InventoryCategoryManager
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        categories={inventoryCategories}
        stockItemCountsByCategory={categoryItemCounts}
        onCreateCategory={createInventoryCategory}
        onUpdateCategory={updateInventoryCategory}
        onDeleteCategory={deleteInventoryCategory}
      />

      <InventoryCountCreateDialog
        open={showCreateCountDialog}
        onOpenChange={setShowCreateCountDialog}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onCreate={async (scope, warehouseId) => {
          const count = await createInventoryCount(scope, warehouseId);
          router.push(`/inventory/counts/${count.id}`);
        }}
      />
    </div>
  );
}
