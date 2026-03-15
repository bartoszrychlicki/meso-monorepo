import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { OrderStatus } from '@/types/enums';
import type { Order } from '@/types/order';

export type RollbackReason =
  | 'terminal_status'
  | 'missing_history'
  | 'invalid_history'
  | 'terminal_target';

export interface RollbackResolution {
  canRollback: boolean;
  targetStatus: OrderStatus | null;
  reason?: RollbackReason;
}

type OrderLifecycleTimestampField =
  | 'confirmed_at'
  | 'preparing_at'
  | 'ready_at'
  | 'picked_up_at'
  | 'delivered_at'
  | 'cancelled_at';

type KitchenRollbackPatch = {
  status: OrderStatus;
  started_at?: null;
  completed_at?: null;
};

const ACTIVE_ROLLBACK_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
]);

const ROLLBACK_BLOCKED_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
]);

const LIFECYCLE_FIELDS: OrderLifecycleTimestampField[] = [
  'confirmed_at',
  'preparing_at',
  'ready_at',
  'picked_up_at',
  'delivered_at',
  'cancelled_at',
];

const PRESERVED_LIFECYCLE_FIELDS: Record<OrderStatus, OrderLifecycleTimestampField[]> = {
  [OrderStatus.PENDING]: [],
  [OrderStatus.CONFIRMED]: ['confirmed_at'],
  [OrderStatus.ACCEPTED]: ['confirmed_at'],
  [OrderStatus.PREPARING]: ['confirmed_at', 'preparing_at'],
  [OrderStatus.READY]: ['confirmed_at', 'preparing_at', 'ready_at'],
  [OrderStatus.OUT_FOR_DELIVERY]: ['confirmed_at', 'preparing_at', 'ready_at', 'picked_up_at'],
  [OrderStatus.DELIVERED]: ['confirmed_at', 'preparing_at', 'ready_at', 'picked_up_at', 'delivered_at'],
  [OrderStatus.CANCELLED]: ['cancelled_at'],
};

export function getRollbackResolution(
  order: Pick<Order, 'status' | 'status_history'>
): RollbackResolution {
  if (ROLLBACK_BLOCKED_STATUSES.has(order.status)) {
    return {
      canRollback: false,
      targetStatus: null,
      reason: 'terminal_status',
    };
  }

  const history = Array.isArray(order.status_history) ? order.status_history : [];
  if (history.length < 2) {
    return {
      canRollback: false,
      targetStatus: null,
      reason: 'missing_history',
    };
  }

  let currentEntryIndex = -1;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.status === order.status) {
      currentEntryIndex = index;
      break;
    }
  }

  if (currentEntryIndex <= 0) {
    return {
      canRollback: false,
      targetStatus: null,
      reason: 'invalid_history',
    };
  }

  for (let index = currentEntryIndex - 1; index >= 0; index -= 1) {
    const candidate = history[index]?.status;
    if (!candidate || candidate === order.status) {
      continue;
    }

    if (!ACTIVE_ROLLBACK_STATUSES.has(candidate)) {
      return {
        canRollback: false,
        targetStatus: null,
        reason: 'terminal_target',
      };
    }

    return {
      canRollback: true,
      targetStatus: candidate,
    };
  }

  return {
    canRollback: false,
    targetStatus: null,
    reason: 'missing_history',
  };
}

export function getRollbackTargetStatus(
  order: Pick<Order, 'status' | 'status_history'>
): OrderStatus | null {
  return getRollbackResolution(order).targetStatus;
}

export function buildRollbackStatusNote(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): string {
  return `Cofnięto status z "${ORDER_STATUS_LABELS[currentStatus]}" do "${ORDER_STATUS_LABELS[targetStatus]}"`;
}

export function getRollbackReasonMessage(reason: RollbackReason): string {
  switch (reason) {
    case 'terminal_status':
      return 'Rollback nie jest dozwolony dla statusow delivered i cancelled.';
    case 'missing_history':
      return 'Brak wczesniejszego statusu, do ktorego mozna cofnac zamowienie.';
    case 'invalid_history':
      return 'Historia statusow jest niespojna i nie pozwala na bezpieczne cofniecie.';
    case 'terminal_target':
      return 'Nie mozna cofnac zamowienia do statusu terminalnego.';
    default:
      return 'Nie mozna cofnac statusu zamowienia.';
  }
}

export function buildRollbackLifecycleTimestampPatch(
  targetStatus: OrderStatus
): Partial<Record<OrderLifecycleTimestampField, null>> {
  const preservedFields = new Set(PRESERVED_LIFECYCLE_FIELDS[targetStatus] ?? []);

  return LIFECYCLE_FIELDS.reduce<Partial<Record<OrderLifecycleTimestampField, null>>>((patch, field) => {
    if (!preservedFields.has(field)) {
      patch[field] = null;
    }

    return patch;
  }, {});
}

export function buildKitchenTicketRollbackPatch(
  targetStatus: OrderStatus
): KitchenRollbackPatch | null {
  switch (targetStatus) {
    case OrderStatus.PENDING:
    case OrderStatus.CONFIRMED:
    case OrderStatus.ACCEPTED:
      return {
        status: OrderStatus.PENDING,
        started_at: null,
        completed_at: null,
      };
    case OrderStatus.PREPARING:
      return {
        status: OrderStatus.PREPARING,
        completed_at: null,
      };
    case OrderStatus.READY:
      return {
        status: OrderStatus.READY,
      };
    default:
      return null;
  }
}
