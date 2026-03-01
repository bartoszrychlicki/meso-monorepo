import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Shield,
  ChefHat,
  CookingPot,
  CreditCard,
  Truck,
  Warehouse,
  UserCog,
} from 'lucide-react';

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: {
    label: 'Administrator',
    color: 'bg-purple-100 text-purple-800',
    icon: Shield,
  },
  manager: {
    label: 'Kierownik',
    color: 'bg-blue-100 text-blue-800',
    icon: UserCog,
  },
  chef: {
    label: 'Szef kuchni',
    color: 'bg-orange-100 text-orange-800',
    icon: ChefHat,
  },
  cook: {
    label: 'Kucharz',
    color: 'bg-yellow-100 text-yellow-800',
    icon: CookingPot,
  },
  cashier: {
    label: 'Kasjer',
    color: 'bg-green-100 text-green-800',
    icon: CreditCard,
  },
  delivery: {
    label: 'Dostawa',
    color: 'bg-violet-100 text-violet-800',
    icon: Truck,
  },
  warehouse: {
    label: 'Magazynier',
    color: 'bg-gray-100 text-gray-800',
    icon: Warehouse,
  },
};

interface RoleBadgeProps {
  role: string;
  className?: string;
  showIcon?: boolean;
}

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    color: 'bg-gray-100 text-gray-800',
    icon: Shield,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('border-0 font-medium gap-1', config.color, className)}
      data-role={role}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
