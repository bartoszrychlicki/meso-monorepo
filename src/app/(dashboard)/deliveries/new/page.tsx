'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { DeliveryForm } from '@/modules/deliveries/components/delivery-form';
import { useInventoryStore } from '@/modules/inventory/store';
import { useDeliveryStore } from '@/modules/deliveries/store';
import { DeliverySource } from '@/types/enums';
import { DeliveryLineRow } from '@/modules/deliveries/components/delivery-line-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewDeliveryPage() {
  const router = useRouter();
  const { isLoading: inventoryLoading, loadAll: loadInventory } = useInventoryStore();
  const { isLoading: deliveryLoading, loadAll: loadDelivery, createDelivery, completeDelivery } = useDeliveryStore();

  useEffect(() => {
    loadInventory();
    loadDelivery();
  }, [loadInventory, loadDelivery]);

  const isLoading = inventoryLoading || deliveryLoading;

  const mapItems = (items: DeliveryLineRow[]) =>
    items.map((item) => ({
      stock_item_id: item.stock_item_id,
      quantity_ordered: item.quantity_ordered ?? undefined,
      quantity_received: item.quantity_received ?? 0,
      unit_price_net: item.unit_price_net ?? undefined,
      vat_rate: item.vat_rate ?? undefined,
      expiry_date: item.expiry_date ?? undefined,
      ai_matched_name: item.ai_matched_name ?? undefined,
      ai_confidence: item.ai_confidence ?? undefined,
      notes: item.notes || undefined,
    }));

  const handleSaveDraft = async (
    data: {
      warehouse_id: string;
      supplier_id: string | null;
      document_number: string | null;
      document_date: string | null;
      source: DeliverySource;
      source_image_url: string | null;
      notes: string | null;
    },
    items: DeliveryLineRow[]
  ) => {
    await createDelivery(
      {
        warehouse_id: data.warehouse_id,
        supplier_id: data.supplier_id,
        document_number: data.document_number,
        document_date: data.document_date,
        source: data.source,
        source_image_url: data.source_image_url,
        notes: data.notes,
      },
      mapItems(items)
    );
    router.push('/deliveries');
  };

  const handleComplete = async (
    data: {
      warehouse_id: string;
      supplier_id: string | null;
      document_number: string | null;
      document_date: string | null;
      source: DeliverySource;
      source_image_url: string | null;
      notes: string | null;
    },
    items: DeliveryLineRow[]
  ) => {
    const delivery = await createDelivery(
      {
        warehouse_id: data.warehouse_id,
        supplier_id: data.supplier_id,
        document_number: data.document_number,
        document_date: data.document_date,
        source: data.source,
        source_image_url: data.source_image_url,
        notes: data.notes,
      },
      mapItems(items)
    );
    await completeDelivery(delivery.id);
    router.push('/deliveries');
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="delivery-new">
        <PageHeader title="Nowa dostawa" />
        <LoadingSkeleton variant="form" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="delivery-new">
      <PageHeader
        title="Nowa dostawa"
        actions={
          <Button variant="ghost" asChild data-action="back-to-deliveries">
            <Link href="/deliveries">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrot do listy
            </Link>
          </Button>
        }
      />
      <DeliveryForm onSaveDraft={handleSaveDraft} onComplete={handleComplete} />
    </div>
  );
}
