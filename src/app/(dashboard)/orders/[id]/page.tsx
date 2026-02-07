'use client';

import { use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder } from '@/modules/orders/hooks';
import { useOrdersStore } from '@/modules/orders/store';
import { OrderDetail } from '@/modules/orders/components/order-detail';
import { OrderStatusBadge } from '@/modules/orders/components/order-status-badge';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS } from '@/lib/constants';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { order, isLoading, refresh } = useOrder(id);
  const { updateOrderStatus, cancelOrder } = useOrdersStore();

  const handleStatusChange = async (
    status: import('@/types/enums').OrderStatus,
    note?: string
  ) => {
    await updateOrderStatus(id, status, note);
    refresh();
    toast.success(`Status zmieniony na: ${ORDER_STATUS_LABELS[status]}`);
  };

  const handleCancel = async (reason: string) => {
    await cancelOrder(id, reason);
    refresh();
    toast.error('Zamowienie zostalo anulowane');
  };

  if (isLoading || !order) {
    return (
      <div className="space-y-6" data-page="order-detail">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="order-detail" data-id={id}>
      <PageHeader
        title={order.order_number}
        description={`Szczegoly zamowienia`}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <Link href="/orders">
              <Button variant="outline" data-action="back-to-orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Lista zamowien
              </Button>
            </Link>
          </div>
        }
      />

      <OrderDetail
        order={order}
        onStatusChange={handleStatusChange}
        onCancel={handleCancel}
      />
    </div>
  );
}
