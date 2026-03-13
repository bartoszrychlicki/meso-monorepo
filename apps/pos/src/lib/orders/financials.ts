type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as GenericRecord;
}

function readNumberLike(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function readMetadataPaymentFee(metadata: unknown): number {
  const record = asRecord(metadata);
  return readNumberLike(record?.payment_fee);
}

export function mergeOrderMetadata(
  existing: unknown,
  patch: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!patch) {
    return asRecord(existing) ?? undefined;
  }

  return {
    ...(asRecord(existing) ?? {}),
    ...patch,
  };
}

export function calculateOrderTotal(input: {
  subtotal: number;
  discount?: number;
  deliveryFee?: number;
  paymentFee?: number;
  tip?: number;
}): number {
  return roundCurrency(
    input.subtotal -
      (input.discount ?? 0) +
      (input.deliveryFee ?? 0) +
      (input.paymentFee ?? 0) +
      (input.tip ?? 0)
  );
}
