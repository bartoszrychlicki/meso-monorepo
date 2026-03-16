'use client';

import { Badge } from '@/components/ui/badge';
import { InventoryCountStatus } from '@/types/inventory';

const STATUS_LABELS: Record<InventoryCountStatus, string> = {
  draft: 'Robocza',
  approved: 'Zatwierdzona',
  cancelled: 'Anulowana',
};

const STATUS_CLASSES: Record<InventoryCountStatus, string> = {
  draft: 'border-0 bg-amber-100 text-amber-800',
  approved: 'border-0 bg-green-100 text-green-800',
  cancelled: 'border-0 bg-slate-200 text-slate-700',
};

interface InventoryCountStatusBadgeProps {
  status: InventoryCountStatus;
}

export function InventoryCountStatusBadge({ status }: InventoryCountStatusBadgeProps) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
