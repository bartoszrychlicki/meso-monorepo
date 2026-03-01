'use client';

import { OrderStatusEntry } from '@/types/order';
import { OrderStatus } from '@/types/enums';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { formatTime, formatDate, cn } from '@/lib/utils';

const STATUS_DOT_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-gray-400',
  [OrderStatus.CONFIRMED]: 'bg-blue-500',
  [OrderStatus.ACCEPTED]: 'bg-indigo-500',
  [OrderStatus.PREPARING]: 'bg-amber-500',
  [OrderStatus.READY]: 'bg-green-500',
  [OrderStatus.OUT_FOR_DELIVERY]: 'bg-violet-500',
  [OrderStatus.DELIVERED]: 'bg-emerald-500',
  [OrderStatus.CANCELLED]: 'bg-red-500',
};

interface OrderTimelineProps {
  history: OrderStatusEntry[];
}

export function OrderTimeline({ history }: OrderTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-0" data-component="order-timeline">
      {sorted.map((entry, index) => (
        <div
          key={`${entry.status}-${entry.timestamp}`}
          className="relative flex gap-3 pb-6 last:pb-0"
          data-status={entry.status}
        >
          {/* Vertical line */}
          {index < sorted.length - 1 && (
            <div className="absolute left-[9px] top-5 h-full w-px bg-border" />
          )}

          {/* Dot */}
          <div
            className={cn(
              'relative z-10 mt-1 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-background ring-2 ring-background',
              STATUS_DOT_COLORS[entry.status]
            )}
          />

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {ORDER_STATUS_LABELS[entry.status]}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatTime(entry.timestamp)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(entry.timestamp)}
            </p>
            {entry.note && (
              <p className="mt-1 text-xs text-muted-foreground italic">
                {entry.note}
              </p>
            )}
            {entry.changed_by && (
              <p className="text-xs text-muted-foreground">
                Zmieniono przez: {entry.changed_by}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
