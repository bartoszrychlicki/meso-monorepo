'use client';

import { useRouter } from 'next/navigation';
import { Order } from '@/types/order';
import { OrderStatus, OrderChannel } from '@/types/enums';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { OrderStatusBadge } from './order-status-badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';

const CHANNEL_LABELS: Record<OrderChannel, string> = {
  [OrderChannel.POS]: 'POS',
  [OrderChannel.ONLINE]: 'Online',
  [OrderChannel.PHONE]: 'Telefon',
  [OrderChannel.DELIVERY_APP]: 'Aplikacja',
};

const STATUS_TABS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Wszystkie' },
  { value: OrderStatus.PENDING, label: 'Oczekujace' },
  { value: OrderStatus.CONFIRMED, label: 'Potwierdzone' },
  { value: OrderStatus.PREPARING, label: 'W przygotowaniu' },
  { value: OrderStatus.READY, label: 'Gotowe' },
  { value: OrderStatus.OUT_FOR_DELIVERY, label: 'W dostawie' },
  { value: OrderStatus.DELIVERED, label: 'Dostarczone' },
  { value: OrderStatus.CANCELLED, label: 'Anulowane' },
];

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  filterStatus: OrderStatus | 'all';
  onFilterChange: (status: OrderStatus | 'all') => void;
}

export function OrderList({
  orders,
  isLoading,
  filterStatus,
  onFilterChange,
}: OrderListProps) {
  const router = useRouter();

  const columns: ColumnDef<Order & Record<string, unknown>>[] = [
    {
      key: 'order_number',
      header: 'Numer',
      render: (order) => (
        <span className="font-mono text-sm font-medium" data-field="order-number">
          {order.order_number}
        </span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Klient',
      render: (order) => (
        <span data-field="customer-name">
          {order.customer_name || 'Anonim'}
        </span>
      ),
    },
    {
      key: 'channel',
      header: 'Kanal',
      render: (order) => (
        <span className="text-sm text-muted-foreground" data-field="channel">
          {CHANNEL_LABELS[order.channel]}
        </span>
      ),
    },
    {
      key: 'items_count',
      header: 'Pozycje',
      render: (order) => (
        <span data-field="items-count">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Kwota',
      sortable: true,
      render: (order) => (
        <span className="font-medium" data-field="total">
          {formatCurrency(order.total)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'created_at',
      header: 'Data',
      sortable: true,
      render: (order) => (
        <span className="text-sm text-muted-foreground" data-field="date">
          {formatDateTime(order.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[60px]',
      render: (order) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/orders/${order.id}`);
          }}
          data-action="view-order"
          data-id={order.id}
          aria-label={`Zobacz zamowienie ${order.order_number}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4" data-component="order-list">
      <Tabs
        value={filterStatus}
        onValueChange={(v) => onFilterChange(v as OrderStatus | 'all')}
      >
        <TabsList className="flex h-auto flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs"
              data-action="filter-status"
              data-status={tab.value}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable<Order & Record<string, unknown>>
        columns={columns}
        data={orders as (Order & Record<string, unknown>)[]}
        isLoading={isLoading}
        searchKey="order_number"
        searchPlaceholder="Szukaj po numerze zamowienia..."
        emptyTitle="Brak zamowien"
        emptyDescription="Nie znaleziono zamowien dla wybranych filtrow"
        onRowClick={(order) => router.push(`/orders/${order.id}`)}
        getRowId={(order) => order.id}
      />
    </div>
  );
}
