'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/modules/orders/hooks';
import { OrderList } from '@/modules/orders/components/order-list';
import { OrderChannel } from '@/types/enums';

export default function OnlineOrdersPage() {
  const {
    isLoading,
    filterStatus,
    setFilterStatus,
    filteredOrders,
  } = useOrders();

  // Filter to only delivery app orders
  const onlineOrders = filteredOrders.filter(
    (o) => o.channel === OrderChannel.DELIVERY_APP
  );

  return (
    <div className="space-y-6" data-page="online-orders">
      <PageHeader
        title="Zamówienia online"
        description="Zamówienia z aplikacji delivery"
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <OrderList
          orders={onlineOrders}
          isLoading={isLoading}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
        />
      )}
    </div>
  );
}
