'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useInventoryStore } from '@/modules/inventory/store';
import { DescriptionTab } from '@/modules/inventory/components/description-tab';
import { OptionsTab } from '@/modules/inventory/components/options-tab';
import { ComponentsTab } from '@/modules/inventory/components/components-tab';
import { UsageTab } from '@/modules/inventory/components/usage-tab';
import { StockItemWarehouseSummary } from '@/modules/inventory/components/stock-item-warehouse-summary';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';

export default function StockItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'opis';

  const {
    currentStockItem,
    currentWarehouseAssignments,
    inventoryCategories,
    detailLoadError,
    isDetailLoading,
    loadStockItemDetail,
    loadWarehouseAssignments,
    loadInventoryCategories,
    loadComponents,
    loadUsage,
    updateStockItem,
    selectedWarehouseId,
  } = useInventoryStore();
  const [lastLoadedItemId, setLastLoadedItemId] = useState<string | null>(null);

  useBreadcrumbLabel(id, currentStockItem?.name);

  const loadDetailData = useCallback(async () => {
    await Promise.all([
      loadStockItemDetail(id),
      loadWarehouseAssignments(id),
      loadInventoryCategories(),
      loadComponents(id),
      loadUsage(id),
    ]);
  }, [id, loadStockItemDetail, loadWarehouseAssignments, loadInventoryCategories, loadComponents, loadUsage]);

  useEffect(() => {
    let cancelled = false;

    void loadDetailData().finally(() => {
      if (!cancelled) {
        setLastLoadedItemId(id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, loadDetailData]);

  const isInitialLoadPending = lastLoadedItemId !== id;

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    router.replace(url.pathname + url.search);
  };

  if ((isInitialLoadPending || isDetailLoading) && !currentStockItem) {
    return (
      <div className="space-y-6" data-page="stock-item-detail">
        <PageHeader title="Ladowanie..." />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  if (!currentStockItem) {
    return (
      <div className="space-y-6" data-page="stock-item-detail">
        <PageHeader title="Nie udalo sie zaladowac pozycji" />
        <Alert variant="destructive" data-status="stock-item-load-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Brak danych pozycji magazynowej</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{detailLoadError ?? 'Nie udalo sie pobrac danych pozycji. Sprobuj ponownie.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadDetailData()} data-action="retry-stock-item-load">
                Sprobuj ponownie
              </Button>
              <Link href="/inventory">
                <Button variant="ghost" data-action="back-to-inventory">
                  Powrot do magazynu
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="stock-item-detail" data-id={id}>
      <PageHeader
        title={currentStockItem.name}
        description={`SKU: ${currentStockItem.sku}`}
        actions={
          <div className="flex gap-2">
            <Link href="/inventory">
              <Button variant="outline" data-action="back-to-inventory">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrot
              </Button>
            </Link>
          </div>
        }
      />

      {detailLoadError ? (
        <Alert variant="destructive" data-status="stock-item-partial-load-warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Niepelne dane szczegolow</AlertTitle>
          <AlertDescription>
            <p>{detailLoadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void loadDetailData()}
              data-action="retry-stock-item-load"
            >
              Sprobuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <StockItemWarehouseSummary
        assignments={currentWarehouseAssignments}
        selectedWarehouseId={selectedWarehouseId}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} data-component="stock-item-tabs">
        <TabsList>
          <TabsTrigger value="opis" data-value="opis">Opis</TabsTrigger>
          <TabsTrigger value="opcje" data-value="opcje">Opcje</TabsTrigger>
          <TabsTrigger value="skladowe" data-value="skladowe">Skladowe</TabsTrigger>
          <TabsTrigger value="uzycie" data-value="uzycie">Uzycie</TabsTrigger>
        </TabsList>

        <TabsContent value="opis">
          <DescriptionTab item={currentStockItem} onSave={updateStockItem} />
        </TabsContent>
        <TabsContent value="opcje">
          <OptionsTab
            item={currentStockItem}
            inventoryCategories={inventoryCategories}
            onSave={updateStockItem}
          />
        </TabsContent>
        <TabsContent value="skladowe">
          <ComponentsTab itemId={id} consumptionType={currentStockItem.consumption_type} />
        </TabsContent>
        <TabsContent value="uzycie">
          <UsageTab itemId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
