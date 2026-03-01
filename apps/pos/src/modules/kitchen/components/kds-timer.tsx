'use client';

import { KitchenTicket } from '@/types/kitchen';
import { useTicketTimer } from '../hooks';
import { cn } from '@/lib/utils';

interface KdsTimerProps {
  ticket: KitchenTicket;
  className?: string;
}

const timerColorClasses: Record<string, string> = {
  green: 'text-emerald-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
};

export function KdsTimer({ ticket, className }: KdsTimerProps) {
  const { formatted, color } = useTicketTimer(ticket);

  return (
    <span
      className={cn(
        'font-mono text-3xl font-bold tabular-nums',
        timerColorClasses[color],
        className
      )}
      data-timer={formatted}
      data-timer-color={color}
    >
      {formatted}
    </span>
  );
}
