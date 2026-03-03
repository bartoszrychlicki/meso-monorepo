'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useInventoryStore } from '@/modules/inventory/store';
import { DescriptionTab } from '@/modules/inventory/components/description-tab';
import { OptionsTab } from '@/modules/inventory/components/options-tab';
import { ComponentsTab } from '@/modules/inventory/components/components-tab';
import { UsageTab } from '@/modules/inventory/components/usage-tab';
import { ArrowLeft } from 'lucide-react';
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
    inventoryCategories,
    isDetailLoading,
    loadStockItemDetail,
    loadInventoryCategories,
    loadComponents,
    loadUsage,
    updateStockItem,
  } = useInventoryStore();

  useBreadcrumbLabel(id, currentStockItem?.name);

  useEffect(() => {
    loadStockItemDetail(id);
    loadInventoryCategories();
    loadComponents(id);
    loadUsage(id);
  }, [id, loadStockItemDetail, loadInventoryCategories, loadComponents, loadUsage]);

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    router.replace(url.pathname + url.search);
  };

  if (isDetailLoading || !currentStockItem) {
    return (
      <div className="space-y-6" data-page="stock-item-detail">
        <PageHeader title="Ladowanie..." />
        <LoadingSkeleton variant="page" />
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
