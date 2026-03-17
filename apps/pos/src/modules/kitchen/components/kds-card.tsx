'use client';

import { useState } from 'react';
import { KitchenTicket } from '@/types/kitchen';
import { OrderStatus } from '@/types/enums';
import { getAutomaticRefundEligibility } from '@/lib/orders/p24-refund';
import { useTicketTimer } from '../hooks';
import { useKitchenStore } from '../store';
import { KdsTimer } from './kds-timer';
import { cn } from '@/lib/utils';
import { Check, ChefHat, ArrowRight, AlertTriangle, Clock3 } from 'lucide-react';
import {
  formatKitchenEstimatedReadyTime,
  formatKitchenScheduledTime,
  normalizeKitchenModifierLabels,
} from '../formatting';
import { toast } from 'sonner';
import {
  OrderCancelDialog,
  type OrderCancelInput,
} from '@/components/shared/order-cancel-dialog';

interface KdsCardProps {
  ticket: KitchenTicket;
}

const borderColorClasses: Record<string, string> = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
};

export function KdsCard({ ticket }: KdsCardProps) {
  const startPreparing = useKitchenStore((s) => s.startPreparing);
  const cancelOrder = useKitchenStore((s) => s.cancelOrder);
  const markItemDone = useKitchenStore((s) => s.markItemDone);
  const markReady = useKitchenStore((s) => s.markReady);
  const markServed = useKitchenStore((s) => s.markServed);
  const { color } = useTicketTimer(ticket);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const isEstimatedPickupTime = !ticket.scheduled_time && ticket.delivery_type === 'pickup';
  const scheduledTimeLabel = ticket.scheduled_time
    ? formatKitchenScheduledTime(ticket.scheduled_time)
    : isEstimatedPickupTime
      ? formatKitchenEstimatedReadyTime(ticket.created_at, ticket.estimated_minutes)
    : null;
  const scheduleLabelPrefix = ticket.delivery_type === 'delivery'
    ? 'Dostawa'
    : isEstimatedPickupTime
      ? 'Odbior ok.'
      : ticket.delivery_type === 'pickup'
      ? 'Odbior'
      : null;
  const refundEligibility = ticket.linked_order
    ? getAutomaticRefundEligibility(ticket.linked_order)
    : { eligible: false };

  const allItemsDone = ticket.items.every((item) => item.is_done);
  const orderNum = ticket.order_number.split('-').pop() || ticket.order_number;

  const handleCancel = async (input: OrderCancelInput) => {
    const result = await cancelOrder(
      ticket.id,
      input.closureReasonCode,
      input.closureReason,
      input.requestRefund
    );
    setCancelDialogOpen(false);

    if (result.refund.status === 'requested') {
      toast.success('Zamowienie anulowane, a zwrot zlecony.');
      return;
    }

    if (result.refund.status === 'manual_action_required') {
      toast.warning(result.refund.message || 'Zamowienie anulowane. Zwrot wymaga recznej obslugi.');
      return;
    }

    toast.success('Zamowienie anulowane.');
  };

  return (
    <div
      className={cn(
        'relative flex min-h-[200px] flex-col rounded-xl border-l-4 bg-white shadow-md transition-all',
        borderColorClasses[color]
      )}
      data-ticket-id={ticket.id}
      data-status={ticket.status}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-slate-900">
              #{orderNum}
            </span>
            {ticket.priority > 1 && (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-sm font-bold text-red-700">
                <AlertTriangle className="h-4 w-4" />
                PRIORYTET
              </span>
            )}
          </div>
          {scheduledTimeLabel && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-700">
              <Clock3 className="h-4 w-4" />
              {scheduleLabelPrefix ? `${scheduleLabelPrefix}: ` : ''}
              {scheduledTimeLabel}
            </div>
          )}
        </div>
        <KdsTimer ticket={ticket} />
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3">
        <ul className="space-y-2">
          {ticket.items.map((item) => {
            const modifierLabels = normalizeKitchenModifierLabels(item.modifiers);

            return (
              <li key={item.id} className="flex items-start gap-3">
                {ticket.status === OrderStatus.PREPARING && (
                  <button
                    type="button"
                    onClick={() => markItemDone(ticket.id, item.id)}
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
                      item.is_done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white hover:border-slate-400'
                    )}
                    data-action="toggle-item"
                    data-item-id={item.id}
                    aria-label={item.is_done ? `${item.product_name} gotowe` : `Oznacz ${item.product_name} jako gotowe`}
                  >
                    {item.is_done && <Check className="h-5 w-5" strokeWidth={3} />}
                  </button>
                )}
                {ticket.status !== OrderStatus.PREPARING && (
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      item.is_done
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    )}
                  >
                    {item.is_done ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <span className="text-sm font-bold">{item.quantity}</span>
                    )}
                  </span>
                )}
                <div className={cn('flex-1', item.is_done && ticket.status === OrderStatus.PREPARING && 'opacity-50')}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      {item.quantity}x
                    </span>
                    <span className={cn(
                      'text-lg font-semibold text-slate-800',
                      item.is_done && ticket.status === OrderStatus.PREPARING && 'line-through'
                    )}>
                      {item.product_name}
                    </span>
                    {item.variant_name && (
                      <span className="text-base text-slate-500">
                        ({item.variant_name})
                      </span>
                    )}
                  </div>
                  {modifierLabels.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {modifierLabels.map((modifier, index) => (
                        <li
                          key={`${item.id}-${index}-${modifier}`}
                          className="inline-flex rounded bg-orange-50 px-1.5 py-0.5 text-sm font-bold text-orange-700"
                        >
                          {modifier}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {ticket.notes && (
          <div className="mt-3 rounded-lg bg-amber-100 border-2 border-amber-400 px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 block mb-0.5">Uwagi:</span>
            <span className="text-base font-bold text-amber-900">{ticket.notes}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-t border-slate-200 px-4 py-3">
        {ticket.status === OrderStatus.PENDING && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => startPreparing(ticket.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-teal-700 active:bg-teal-800"
              data-action="start-preparing"
              aria-label={`Rozpocznij przygotowanie zamowienia #${orderNum}`}
            >
              <ChefHat className="h-6 w-6" />
              Rozpocznij
            </button>
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-6 py-3 text-base font-bold text-red-700 transition-colors hover:bg-red-100"
              data-action="cancel-order"
              aria-label={`Anuluj zamowienie #${orderNum}`}
            >
              Anuluj
            </button>
          </div>
        )}

        {ticket.status === OrderStatus.PREPARING && (
          <button
            type="button"
            onClick={() => markReady(ticket.id)}
            disabled={!allItemsDone}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-bold transition-colors',
              allItemsDone
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            )}
            data-action="mark-ready"
            aria-label={allItemsDone ? `Oznacz zamowienie #${orderNum} jako gotowe` : `Gotowe ${ticket.items.filter(i => i.is_done).length} z ${ticket.items.length}`}
          >
            <Check className="h-6 w-6" />
            {allItemsDone ? 'Gotowe' : `Gotowe (${ticket.items.filter(i => i.is_done).length}/${ticket.items.length})`}
          </button>
        )}

        {ticket.status === OrderStatus.READY && (
          <button
            type="button"
            onClick={() => markServed(ticket.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
            data-action="serve"
            aria-label={`Wydaj zamowienie #${orderNum}`}
          >
            <ArrowRight className="h-6 w-6" />
            Wydaj
          </button>
        )}
      </div>

      <OrderCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        orderNumber={`#${orderNum}`}
        refundableAmount={refundEligibility.eligible ? ticket.linked_order?.total : undefined}
      />
    </div>
  );
}
