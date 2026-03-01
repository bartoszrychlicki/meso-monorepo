import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  className?: string;
}

export function StatusBadge({
  status,
  colorMap = {},
  labelMap = {},
  className,
}: StatusBadgeProps) {
  const colorClass = colorMap[status] || 'bg-gray-100 text-gray-800';
  const label = labelMap[status] || status;

  return (
    <Badge
      variant="outline"
      className={cn('border-0 font-medium', colorClass, className)}
      data-status={status}
    >
      {label}
    </Badge>
  );
}
