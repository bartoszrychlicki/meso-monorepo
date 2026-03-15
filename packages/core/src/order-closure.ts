import { OrderClosureReasonCode } from './enums';

export const ORDER_CLOSURE_REASON_LABELS: Record<OrderClosureReasonCode, string> = {
  [OrderClosureReasonCode.MISSING_INGREDIENTS]: 'Brak składników',
  [OrderClosureReasonCode.MISSING_PACKAGING]: 'Brak opakowań',
  [OrderClosureReasonCode.DELIVERY_UNAVAILABLE]: 'Brak możliwości dostawy',
  [OrderClosureReasonCode.HIGH_LOAD]: 'Za duży ruch',
  [OrderClosureReasonCode.LOCATION_CLOSED]: 'Lokal nieczynny',
  [OrderClosureReasonCode.CUSTOM]: 'Inny powód',
};

export const ORDER_CLOSURE_REASON_OPTIONS = [
  {
    code: OrderClosureReasonCode.MISSING_INGREDIENTS,
    label: ORDER_CLOSURE_REASON_LABELS[OrderClosureReasonCode.MISSING_INGREDIENTS],
  },
  {
    code: OrderClosureReasonCode.MISSING_PACKAGING,
    label: ORDER_CLOSURE_REASON_LABELS[OrderClosureReasonCode.MISSING_PACKAGING],
  },
  {
    code: OrderClosureReasonCode.DELIVERY_UNAVAILABLE,
    label: ORDER_CLOSURE_REASON_LABELS[OrderClosureReasonCode.DELIVERY_UNAVAILABLE],
  },
  {
    code: OrderClosureReasonCode.HIGH_LOAD,
    label: ORDER_CLOSURE_REASON_LABELS[OrderClosureReasonCode.HIGH_LOAD],
  },
  {
    code: OrderClosureReasonCode.LOCATION_CLOSED,
    label: ORDER_CLOSURE_REASON_LABELS[OrderClosureReasonCode.LOCATION_CLOSED],
  },
] as const;

export function getOrderClosureReasonLabel(
  code: OrderClosureReasonCode | null | undefined
): string | null {
  if (!code) return null;
  return ORDER_CLOSURE_REASON_LABELS[code] ?? null;
}

export function normalizeOrderClosureReason(input: {
  closure_reason_code?: OrderClosureReasonCode | null;
  closure_reason?: string | null;
  note?: string | null;
}): {
  closure_reason_code: OrderClosureReasonCode | null;
  closure_reason: string | null;
  note: string | null;
} {
  const trimmedReason = input.closure_reason?.trim() ?? '';
  const trimmedNote = input.note?.trim() ?? '';

  if (input.closure_reason_code && input.closure_reason_code !== OrderClosureReasonCode.CUSTOM) {
    const label = getOrderClosureReasonLabel(input.closure_reason_code);
    return {
      closure_reason_code: input.closure_reason_code,
      closure_reason: label,
      note: label,
    };
  }

  if (trimmedReason) {
    return {
      closure_reason_code: OrderClosureReasonCode.CUSTOM,
      closure_reason: trimmedReason,
      note: trimmedReason,
    };
  }

  if (trimmedNote) {
    return {
      closure_reason_code: OrderClosureReasonCode.CUSTOM,
      closure_reason: trimmedNote,
      note: trimmedNote,
    };
  }

  return {
    closure_reason_code: null,
    closure_reason: null,
    note: null,
  };
}
