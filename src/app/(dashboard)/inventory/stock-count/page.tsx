'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { StockCountList } from '@/modules/inventory/components/stock-count-list';
import { StockCount, Warehouse } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function StockCountPage() {
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [countsData, warehousesData] = await Promise.all([
        inventoryRepository.stockCounts.findMany(() => true),
        inventoryRepository.getAllWarehouses(),
      ]);
      setStockCounts(countsData);
      setWarehouses(warehousesData);
    } catch (error) {
      toast.error('Nie udało się załadować inwentaryzacji');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast.success('Odświeżono listę inwentaryzacji');
    } catch (error) {
      toast.error('Nie udało się odświeżyć');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateCount = () => {
    toast.info('Tworzenie inwentaryzacji - dostępne wkrótce');
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="stock-count">
        <PageHeader
          title="Inwentaryzacja"
          description="Liczenie stanów magazynowych i wykrywanie rozbieżności"
        />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="stock-count">
      <PageHeader
        title="Inwentaryzacja"
        description="Zarządzanie inwentaryzacjami magazynowymi i kontrolą stanów"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-action="refresh-stock-counts"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCount}
              data-action="create-stock-count"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nowa inwentaryzacja
            </Button>
          </div>
        }
      />

      <StockCountList
        stockCounts={stockCounts}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      />
    </div>
  );
}
