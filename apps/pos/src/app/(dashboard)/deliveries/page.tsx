'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { DeliveryTable } from '@/modules/deliveries/components/delivery-table';
import { SupplierManager } from '@/modules/deliveries/components/supplier-manager';
import { useDeliveryStore } from '@/modules/deliveries/store';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

export default function DeliveriesPage() {
  const {
    deliveries,
    suppliers,
    isLoading,
    loadAll,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  } = useDeliveryStore();

  const [showSupplierManager, setShowSupplierManager] = useState(false);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (isLoading && deliveries.length === 0) {
    return (
      <div className="space-y-6" data-page="deliveries">
        <PageHeader title="Dostawy" description="Przyjecia magazynowe" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="deliveries">
      <PageHeader
        title="Dostawy"
        description="Przyjecia magazynowe"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSupplierManager(true)}
              data-action="manage-suppliers"
            >
              <Users className="mr-2 h-4 w-4" />
              Dostawcy
            </Button>
            <Button asChild data-action="new-delivery">
              <Link href="/deliveries/new">
                <Plus className="mr-2 h-4 w-4" />
                Nowa dostawa
              </Link>
            </Button>
          </div>
        }
      />

      <DeliveryTable deliveries={deliveries} suppliers={suppliers} />

      <SupplierManager
        open={showSupplierManager}
        onOpenChange={setShowSupplierManager}
        suppliers={suppliers}
        onCreateSupplier={createSupplier}
        onUpdateSupplier={updateSupplier}
        onDeleteSupplier={deleteSupplier}
      />
    </div>
  );
}
