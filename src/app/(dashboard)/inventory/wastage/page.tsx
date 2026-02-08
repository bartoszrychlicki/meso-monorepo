'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { WastageList } from '@/modules/inventory/components/wastage-list';
import { WastageRecord, StockItem } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function WastagePage() {
  const [wastageRecords, setWastageRecords] = useState<WastageRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wastageData, stockItemsData] = await Promise.all([
        inventoryRepository.wastage.findMany(() => true),
        inventoryRepository.getAllStockItems(),
      ]);
      setWastageRecords(wastageData);
      setStockItems(stockItemsData);
    } catch (error) {
      toast.error('Nie udało się załadować danych marnotrawstwa');
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
      toast.success('Odświeżono listę');
    } catch (error) {
      toast.error('Nie udało się odświeżyć');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRecordWastage = () => {
    toast.info('Zgłaszanie marnotrawstwa - dostępne wkrótce');
  };

  const handleExport = () => {
    toast.info('Eksport danych - dostępne wkrótce');
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="wastage">
        <PageHeader title="Marnotrawstwo" description="Straty i odpady magazynowe" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="wastage">
      <PageHeader
        title="Marnotrawstwo"
        description="Tracking strat, odpadów i marnotrawstwa magazynowego"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              data-action="export-wastage"
            >
              <Download className="mr-2 h-4 w-4" />
              Eksportuj
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-action="refresh-wastage"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Button size="sm" onClick={handleRecordWastage} data-action="record-wastage">
              <Plus className="mr-2 h-4 w-4" />
              Zgłoś marnotrawstwo
            </Button>
          </div>
        }
      />

      <WastageList
        wastageRecords={wastageRecords}
        stockItems={stockItems.map((si) => ({ id: si.id, name: si.name }))}
      />
    </div>
  );
}
