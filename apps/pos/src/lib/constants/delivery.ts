import { DeliveryStatus, DeliverySource } from '@/types/enums';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.DRAFT]: 'Szkic',
  [DeliveryStatus.COMPLETED]: 'Przyjeta',
};

export const DELIVERY_SOURCE_LABELS: Record<DeliverySource, string> = {
  [DeliverySource.AI_SCAN]: 'AI Skan',
  [DeliverySource.MANUAL]: 'Reczna',
};
