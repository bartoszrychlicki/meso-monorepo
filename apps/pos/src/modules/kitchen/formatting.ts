import { addDays, format, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ModifierAction } from '@/types/enums';
import type { OrderItemModifier } from '@/types/order';

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

  const seen = new Set<string>();

  return labels.reduce<string[]>((result, label) => {
    const normalized = label.trim();
    if (!normalized || seen.has(normalized)) {
      return result;
    }

    seen.add(normalized);
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
