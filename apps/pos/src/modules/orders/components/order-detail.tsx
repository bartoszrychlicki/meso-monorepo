'use client';

import { useState } from 'react';
import { Order } from '@/types/order';
import {
  ModifierAction,
  OrderStatus,
  OrderChannel,
  OrderSource,
  PaymentMethod,
  PaymentStatus,
} from '@/types/enums';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  XCircle,
  Phone,
  User,
  MapPin,
  FileText,
  Clock,
  ShoppingBag,
} from 'lucide-react';

const CHANNEL_LABELS: Record<OrderChannel, string> = {
  [OrderChannel.POS]: 'POS',
  [OrderChannel.ONLINE]: 'Online',
  [OrderChannel.PHONE]: 'Telefon',
  [OrderChannel.DELIVERY_APP]: 'Aplikacja dostawy',
};

const SOURCE_LABELS: Record<OrderSource, string> = {
  [OrderSource.DINE_IN]: 'Na miejscu',
  [OrderSource.TAKEAWAY]: 'Na wynos',
  [OrderSource.DELIVERY]: 'Dostawa',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Gotówka',
  [PaymentMethod.CARD]: 'Karta',
  [PaymentMethod.BLIK]: 'BLIK',
  [PaymentMethod.ONLINE]: 'Online',
  [PaymentMethod.VOUCHER]: 'Voucher',
  [PaymentMethod.PAY_ON_PICKUP]: 'Przy odbiorze',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Oczekuje',
  [PaymentStatus.PAID]: 'Opłacone',
  [PaymentStatus.FAILED]: 'Nieudane',
  [PaymentStatus.REFUNDED]: 'Zwrócone',
  [PaymentStatus.PAY_ON_PICKUP]: 'Przy odbiorze',
};

const MODIFIER_ACTION_LABELS: Record<ModifierAction, string> = {
  [ModifierAction.ADD]: '+',
  [ModifierAction.REMOVE]: '-',
  [ModifierAction.SUBSTITUTE]: '↔',
  [ModifierAction.PREPARATION]: '•',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.ACCEPTED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
};

const NEXT_STATUS_PICKUP: Partial<Record<OrderStatus, OrderStatus>> = {
  ...NEXT_STATUS,
  [OrderStatus.READY]: OrderStatus.DELIVERED,
};

interface OrderDetailProps {
  order: Order;
  onStatusChange: (status: OrderStatus, note?: string) => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
}

interface TimestampField {
  key: keyof Order;
  label: string;
}

const TIMESTAMP_FIELDS: TimestampField[] = [
  { key: 'created_at', label: 'Utworzone' },
  { key: 'paid_at', label: 'Opłacone' },
  { key: 'confirmed_at', label: 'Potwierdzone' },
  { key: 'preparing_at', label: 'Rozpoczęto przygotowanie' },
  { key: 'ready_at', label: 'Gotowe' },
  { key: 'picked_up_at', label: 'Wydane' },
  { key: 'delivered_at', label: 'Dostarczone' },
  { key: 'cancelled_at', label: 'Anulowane' },
];

function formatModifierLine(modifier: Order['items'][number]['modifiers'][number]) {
  const actionLabel = MODIFIER_ACTION_LABELS[modifier.modifier_action] || '+';
  const quantity = modifier.quantity > 1 ? ` x${modifier.quantity}` : '';
  const lineTotal = modifier.price * modifier.quantity;
  return `${actionLabel} ${modifier.name}${quantity} (${formatCurrency(lineTotal)})`;
}

export function OrderDetail({
  order,
  onStatusChange,
  onCancel,
}: OrderDetailProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isDelivery = order.source === OrderSource.DELIVERY;
  const statusMap = isDelivery ? NEXT_STATUS : NEXT_STATUS_PICKUP;
  const nextStatus = statusMap[order.status];
  const canCancel =
    order.status !== OrderStatus.CANCELLED &&
    order.status !== OrderStatus.DELIVERED;
  const netAmount = order.total - order.tax;

  const handleNextStatus = async () => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      await onStatusChange(nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setIsUpdating(true);
    try {
      await onCancel(cancelReason);
      setCancelDialogOpen(false);
      setCancelReason('');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6" data-component="order-detail">
      {/* Header info */}
      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} className="text-sm" />
        <span className="text-sm text-muted-foreground">
          {CHANNEL_LABELS[order.channel]}
        </span>
        <span className="text-sm text-muted-foreground">
          {SOURCE_LABELS[order.source]}
        </span>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(order.created_at)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {nextStatus && (
          <Button
            onClick={handleNextStatus}
            disabled={isUpdating}
            data-action="next-status"
            data-status={nextStatus}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {ORDER_STATUS_LABELS[nextStatus]}
          </Button>
        )}
        {canCancel && (
          <Button
            variant="destructive"
            onClick={() => setCancelDialogOpen(true)}
            disabled={isUpdating}
            data-action="cancel-order"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Anuluj zamowienie
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" />
                Pozycje zamowienia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead className="text-center">Ilosc</TableHead>
                    <TableHead className="text-right">Cena jedn.</TableHead>
                    <TableHead className="text-right">Wartosc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id} data-id={item.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {item.product_name}
                          </span>
                          {item.variant_name && (
                            <span className="ml-1 text-sm text-muted-foreground">
                              ({item.variant_name})
                            </span>
                          )}
                          {item.variant_id && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              ID wariantu: {item.variant_id}
                            </p>
                          )}
                          {(item.modifiers?.length ?? 0) > 0 && (
                            <div className="mt-0.5 space-y-0.5">
                              {item.modifiers!.map((mod) => (
                                <p
                                  key={mod.modifier_id}
                                  className="text-xs font-semibold text-orange-700"
                                >
                                  {formatModifierLine(mod)}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <p className="mt-0.5 text-xs font-semibold italic text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(item.unit_price)}</span>
                          {item.original_unit_price != null && item.original_unit_price > item.unit_price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(item.original_unit_price)}
                            </span>
                          )}
                          {item.promotion_label && (
                            <span className="text-[10px] font-medium text-emerald-700">
                              {item.promotion_label}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-3" />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suma czesciowa</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Rabat</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {typeof order.delivery_fee === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dostawa</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}
                {typeof order.tip === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Napiwek</span>
                    <span>{formatCurrency(order.tip)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between" data-field="order-net">
                  <span className="text-muted-foreground">Kwota netto</span>
                  <span>{formatCurrency(netAmount)}</span>
                </div>
                <div className="flex justify-between" data-field="order-vat">
                  <span className="text-muted-foreground">Podatek VAT</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                <div
                  className="flex justify-between text-base font-semibold"
                  data-field="order-gross"
                >
                  <span>Kwota brutto</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & delivery info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Dane klienta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.customer_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span data-field="customer-name">
                      {order.customer_name}
                    </span>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span data-field="customer-phone">
                      {order.customer_phone}
                    </span>
                  </div>
                )}
                {!order.customer_name && !order.customer_phone && (
                  <p className="text-muted-foreground">Brak danych klienta</p>
                )}
              </CardContent>
            </Card>

            {order.delivery_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Adres dostawy
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm" data-field="delivery-address">
                  <p>{order.delivery_address.street}</p>
                  <p>
                    {order.delivery_address.postal_code}{' '}
                    {order.delivery_address.city}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Uwagi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900" data-field="notes">
                  {order.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Historia statusow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline history={order.status_history} />
            </CardContent>
          </Card>

          <Card data-component="order-metadata">
            <CardHeader>
              <CardTitle className="text-base">Szczegóły zamówienia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Metoda płatności</span>
                <span className="text-right">
                  {order.payment_method
                    ? (PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method)
                    : 'Brak'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status płatności</span>
                <span className="text-right">
                  {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}
                </span>
              </div>
              {order.delivery_type && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Typ realizacji</span>
                  <span className="text-right">
                    {order.delivery_type === 'delivery' ? 'Dostawa' : 'Odbiór'}
                  </span>
                </div>
              )}
              {order.scheduled_time && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Zaplanowane na</span>
                  <span className="text-right">{formatDateTime(order.scheduled_time)}</span>
                </div>
              )}
              {order.promo_code && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Kod promocyjny</span>
                  <span className="text-right">{order.promo_code}</span>
                </div>
              )}
              {typeof order.promo_discount === 'number' && order.promo_discount > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Rabat promocyjny</span>
                  <span className="text-right">{formatCurrency(order.promo_discount)}</span>
                </div>
              )}
              {typeof order.tip === 'number' && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Napiwek</span>
                  <span className="text-right">{formatCurrency(order.tip)}</span>
                </div>
              )}
              {order.external_order_id && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">ID zewnętrzne</span>
                  <span className="text-right break-all">{order.external_order_id}</span>
                </div>
              )}
              {order.external_channel && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Kanał zewnętrzny</span>
                  <span className="text-right">{order.external_channel}</span>
                </div>
              )}
              {typeof order.loyalty_points_earned === 'number' && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Punkty loyalty</span>
                  <span className="text-right">{order.loyalty_points_earned}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">ID lokalizacji</span>
                <span className="text-right break-all">{order.location_id}</span>
              </div>
              {order.customer_id && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">ID klienta</span>
                  <span className="text-right break-all">{order.customer_id}</span>
                </div>
              )}
              {order.assigned_to && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Przypisane do</span>
                  <span className="text-right break-all">{order.assigned_to}</span>
                </div>
              )}

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Znaczniki czasu
                </p>
                {TIMESTAMP_FIELDS.map((field) => {
                  const value = order[field.key];
                  if (!value || typeof value !== 'string') return null;
                  return (
                    <div key={field.key} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="text-right">{formatDateTime(value)}</span>
                    </div>
                  );
                })}
              </div>

              {order.metadata && Object.keys(order.metadata).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Metadata
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(order.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel dialog with reason */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent data-component="cancel-order-dialog">
          <DialogHeader>
            <DialogTitle>Anuluj zamowienie</DialogTitle>
            <DialogDescription>
              Podaj powod anulowania zamowienia {order.order_number}.
            </DialogDescription>
          </DialogHeader>
          {(order.status === OrderStatus.PREPARING || order.status === OrderStatus.READY) && (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {order.status === OrderStatus.PREPARING
                  ? 'To zamowienie jest w trakcie przygotowania! Kuchnia juz nad nim pracuje.'
                  : 'To zamowienie jest juz gotowe do wydania!'}
              </div>
            </div>
          )}
          <div className="py-4">
            <Label htmlFor="cancel-reason">Powod anulowania</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Np. Zmiana planow klienta..."
              className="mt-1.5"
              data-field="cancel-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              data-action="cancel-dialog-close"
            >
              Zamknij
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || isUpdating}
              data-action="confirm-cancel"
            >
              Anuluj zamowienie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
