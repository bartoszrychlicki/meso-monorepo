import { addDays, addMinutes, format, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ModifierAction } from '@/types/enums';
import type { OrderItemModifier } from '@/types/order';
import type { KitchenTicket } from '@/types/kitchen';

export function formatKitchenModifierLabel(
  modifier: Pick<OrderItemModifier, 'name' | 'quantity' | 'modifier_action'>
): string {
  const name = modifier.name.trim();
  if (!name) return '';

  const quantitySuffix = modifier.quantity > 1 ? ` x${modifier.quantity}` : '';

  switch (modifier.modifier_action) {
    case ModifierAction.REMOVE:
      return `- ${name}${quantitySuffix}`;
    case ModifierAction.SUBSTITUTE:
      return `↔ ${name}${quantitySuffix}`;
    case ModifierAction.PREPARATION:
      return `• ${name}${quantitySuffix}`;
    case ModifierAction.ADD:
    default:
      return `${name}${quantitySuffix}`;
  }
}

export function normalizeKitchenModifierLabels(
  labels: readonly string[] | null | undefined
): string[] {
  if (!labels) return [];

  return labels.reduce<string[]>((result, label) => {
    const normalized = label.trim();
    if (!normalized) {
      return result;
    }

    result.push(normalized);
    return result;
  }, []);
}

export function formatKitchenScheduledTime(
  scheduledTime: string,
  referenceDate: Date = new Date()
): string | null {
  const scheduledAt = new Date(scheduledTime);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  if (isSameDay(scheduledAt, referenceDate)) {
    return format(scheduledAt, 'HH:mm', { locale: pl });
  }

  if (isSameDay(scheduledAt, addDays(referenceDate, 1))) {
    return `jutro, ${format(scheduledAt, 'HH:mm', { locale: pl })}`;
  }

  return format(scheduledAt, 'd MMM, HH:mm', { locale: pl });
}

export function formatKitchenEstimatedReadyTime(
  createdAt: string,
  estimatedMinutes: number,
  referenceDate: Date = new Date()
): string | null {
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
    return null;
  }

  const createdAtDate = new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) {
    return null;
  }

  return formatKitchenScheduledTime(
    addMinutes(createdAtDate, estimatedMinutes).toISOString(),
    referenceDate
  );
}

export function resolveKitchenTicketCurrentPickupTime(ticket: KitchenTicket): string | null {
  if (ticket.estimated_ready_at) {
    return ticket.estimated_ready_at;
  }

  if (ticket.scheduled_time) {
    return ticket.scheduled_time;
  }

  if (ticket.delivery_type !== 'pickup') {
    return null;
  }

  if (!Number.isFinite(ticket.estimated_minutes) || ticket.estimated_minutes <= 0) {
    return null;
  }

  const createdAt = new Date(ticket.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return addMinutes(createdAt, ticket.estimated_minutes).toISOString();
}
