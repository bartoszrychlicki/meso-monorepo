import { OrderStatus } from '@/types/enums';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/status-badge';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      colorMap={ORDER_STATUS_COLORS}
      labelMap={ORDER_STATUS_LABELS}
      className={className}
    />
  );
}
