'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types/order';
import { OrderStatus, OrderChannel } from '@/types/enums';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderStatusBadge } from './order-status-badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';
import {
  filterOrdersByDateRange,
  getOrderItemsCount,
  getOrderReportSummary,
  getPresetDateRange,
  OrderDatePreset,
} from '../report';

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

const DATE_PRESETS: Array<{
  value: Exclude<OrderDatePreset, 'custom'>;
  label: string;
}> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'today', label: 'Dzisiaj' },
  { value: 'yesterday', label: 'Wczoraj' },
  { value: 'this_week', label: 'Ten tydzien' },
  { value: 'last_week', label: 'Zeszly tydzien' },
  { value: 'this_month', label: 'Ten miesiac' },
  { value: 'last_month', label: 'Poprzedni miesiac' },
  { value: 'this_year', label: 'Ten rok' },
];

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  filterStatus: OrderStatus | 'all';
  onFilterChange: (status: OrderStatus | 'all') => void;
}

function OrderListSummary({ orders }: { orders: Order[] }) {
  const summary = getOrderReportSummary(orders);

  return (
    <div className="space-y-3" data-component="orders-report-summary">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Podsumowanie wynikow
        </p>
        <p className="text-sm text-muted-foreground">
          Liczone dla aktualnie widocznych zamowien.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pozycje</p>
          <p className="mt-1 text-2xl font-semibold">{summary.itemsCount}</p>
        </div>

        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Zamowienia</p>
          <p className="mt-1 text-2xl font-semibold">{summary.orderCount}</p>
        </div>

        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Suma</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(summary.total)}</p>
        </div>
      </div>
    </div>
  );
}

export function OrderList({
  orders,
  isLoading,
  filterStatus,
  onFilterChange,
}: OrderListProps) {
  const router = useRouter();
  const [datePreset, setDatePreset] = useState<OrderDatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredByDateOrders = useMemo(
    () => filterOrdersByDateRange(orders, { from: dateFrom, to: dateTo }),
    [orders, dateFrom, dateTo]
  );

  const handleDatePresetChange = (preset: Exclude<OrderDatePreset, 'custom'>) => {
    const range = getPresetDateRange(preset);
    setDatePreset(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    const nextFrom = field === 'from' ? value : dateFrom;
    const nextTo = field === 'to' ? value : dateTo;

    setDateFrom(nextFrom);
    setDateTo(nextTo);
    setDatePreset(nextFrom || nextTo ? 'custom' : 'all');
  };

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
          {getOrderItemsCount(order)}
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

      <div className="rounded-xl border bg-card p-4 shadow-sm" data-component="orders-date-filter">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Raport po dacie</p>
              <p className="text-sm text-muted-foreground">
                Wybierz szybki zakres albo ustaw wlasne daty od-do.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={datePreset === preset.value ? 'default' : 'outline'}
                  onClick={() => handleDatePresetChange(preset.value)}
                  data-action="filter-date-preset"
                  data-preset={preset.value}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orders-date-from">Od</Label>
              <Input
                id="orders-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => handleDateChange('from', event.target.value)}
                data-field="date-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orders-date-to">Do</Label>
              <Input
                id="orders-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => handleDateChange('to', event.target.value)}
                data-field="date-to"
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable<Order & Record<string, unknown>>
        columns={columns}
        data={filteredByDateOrders as (Order & Record<string, unknown>)[]}
        isLoading={isLoading}
        searchKey="order_number"
        searchPlaceholder="Szukaj po numerze zamowienia..."
        emptyTitle="Brak zamowien"
        emptyDescription="Nie znaleziono zamowien dla wybranych filtrow"
        onRowClick={(order) => router.push(`/orders/${order.id}`)}
        getRowId={(order) => order.id}
        renderFooter={(visibleOrders) => (
          <OrderListSummary orders={visibleOrders as Order[]} />
        )}
      />
    </div>
  );
}
