export interface PickupTimeAdjustment {
  previous_time: string;
  new_time: string;
  changed_at: string;
  source: string;
}

type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;
}

function isPickupTimeAdjustment(value: unknown): value is PickupTimeAdjustment {
  const record = asRecord(value);
  return !!record &&
    typeof record.previous_time === 'string' &&
    typeof record.new_time === 'string' &&
    typeof record.changed_at === 'string' &&
    typeof record.source === 'string';
}

export function readPickupTimeAdjustments(
  metadata: Record<string, unknown> | null | undefined
): PickupTimeAdjustment[] {
  const raw = metadata?.pickup_time_adjustments;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isPickupTimeAdjustment);
}

export function getLatestPickupTimeAdjustment(
  metadata: Record<string, unknown> | null | undefined
): PickupTimeAdjustment | null {
  const adjustments = readPickupTimeAdjustments(metadata);
  return adjustments.length > 0 ? adjustments[adjustments.length - 1] : null;
}

export function appendPickupTimeAdjustment(
  metadata: Record<string, unknown> | null | undefined,
  adjustment: PickupTimeAdjustment
): Record<string, unknown> {
  const baseMetadata = asRecord(metadata) ?? {};
  const adjustments = readPickupTimeAdjustments(baseMetadata);

  return {
    ...baseMetadata,
    pickup_time_adjustments: [...adjustments, adjustment],
  };
}
