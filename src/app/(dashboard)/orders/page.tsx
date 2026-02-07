'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/modules/orders/hooks';
import { OrderList } from '@/modules/orders/components/order-list';
import { Plus, ShoppingCart, DollarSign, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function OrdersPage() {
  const {
    isLoading,
    filterStatus,
    setFilterStatus,
    filteredOrders,
    todaysRevenue,
    todaysOrderCount,
  } = useOrders();

  const activeCount = filteredOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

  return (
    <div className="space-y-6" data-page="orders">
      <PageHeader
        title="Zamowienia"
        description="Zarzadzaj zamowieniami"
        actions={
          <Link href="/orders/new">
            <Button data-action="new-order">
              <Plus className="mr-2 h-4 w-4" />
              Nowe zamowienie
            </Button>
          </Link>
        }
      />

      {/* Quick stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Zamowienia dzisiaj"
            value={todaysOrderCount}
            className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20"
          />
          <KpiCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Przychod dzisiaj"
            value={formatCurrency(todaysRevenue)}
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
          />
          <KpiCard
            icon={<Activity className="h-5 w-5" />}
            label="Aktywne zamowienia"
            value={activeCount}
            className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
          />
        </div>
      )}

      <OrderList
        orders={filteredOrders}
        isLoading={isLoading}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
      />
    </div>
  );
}
