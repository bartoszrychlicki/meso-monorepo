'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { BatchList } from '@/modules/inventory/components/batch-list';
import { Batch, StockItem } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedStockItem, setSelectedStockItem] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [batchesData, stockItemsData] = await Promise.all([
        inventoryRepository.batches.findMany(() => true),
        inventoryRepository.getAllStockItems(),
      ]);
      setBatches(batchesData);
      setStockItems(stockItemsData);
    } catch (error) {
      toast.error('Nie udało się załadować danych partii');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatuses = async () => {
    setIsUpdating(true);
    try {
      const updatedCount = await inventoryRepository.updateBatchStatuses();
      toast.success(`Zaktualizowano ${updatedCount} statusów partii`);
      await loadData();
    } catch (error) {
      toast.error('Nie udało się zaktualizować statusów');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    toast.info('Eksport CSV - dostępne wkrótce');
  };

  const filteredBatches =
    selectedStockItem === 'all'
      ? batches
      : batches.filter((b) => b.stock_item_id === selectedStockItem);

  const selectedStockItemName =
    selectedStockItem === 'all'
      ? undefined
      : stockItems.find((s) => s.id === selectedStockItem)?.name;

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="batches">
        <PageHeader title="Partie magazynowe" description="FEFO - First Expired First Out" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="batches">
      <PageHeader
        title="Partie magazynowe"
        description="Śledzenie partii według FEFO (First Expired First Out)"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              data-action="export-batches"
            >
              <Download className="mr-2 h-4 w-4" />
              Eksportuj
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateStatuses}
              disabled={isUpdating}
              data-action="update-batch-statuses"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              Aktualizuj statusy
            </Button>
          </div>
        }
      />

      {/* Filter by Stock Item */}
      <div className="flex items-center gap-4">
        <label htmlFor="stock-item-filter" className="text-sm font-medium">
          Filtruj po produkcie:
        </label>
        <Select value={selectedStockItem} onValueChange={setSelectedStockItem}>
          <SelectTrigger id="stock-item-filter" className="w-64">
            <SelectValue placeholder="Wszystkie produkty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie produkty</SelectItem>
            {stockItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedStockItem !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStockItem('all')}
          >
            Wyczyść filtr
          </Button>
        )}
      </div>

      <BatchList batches={filteredBatches} stockItemName={selectedStockItemName} />
    </div>
  );
}
