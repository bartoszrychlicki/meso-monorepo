'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { TransferList } from '@/modules/inventory/components/transfer-list';
import { StockTransfer, Warehouse } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transfersData, warehousesData] = await Promise.all([
        inventoryRepository.transfers.findMany(() => true),
        inventoryRepository.getAllWarehouses(),
      ]);
      setTransfers(transfersData);
      setWarehouses(warehousesData);
    } catch (error) {
      toast.error('Nie udało się załadować transferów');
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
      toast.success('Odświeżono listę transferów');
    } catch (error) {
      toast.error('Nie udało się odświeżyć');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateTransfer = () => {
    toast.info('Tworzenie transferu - dostępne wkrótce');
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="transfers">
        <PageHeader
          title="Transfery magazynowe"
          description="Przesunięcia towarów między magazynami"
        />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="transfers">
      <PageHeader
        title="Transfery magazynowe"
        description="Zarządzanie przesunięciami towarów między KC a punktami sprzedaży"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-action="refresh-transfers"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTransfer}
              data-action="create-transfer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nowy transfer
            </Button>
          </div>
        }
      />

      <TransferList
        transfers={transfers}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      />
    </div>
  );
}
