const WEIGHT_CONVERSIONS: Record<string, number> = {
  kg: 1000,
  g: 1,
  dag: 10,
  mg: 0.001,
};

const VOLUME_CONVERSIONS: Record<string, number> = {
  l: 1000,
  dl: 100,
  ml: 1,
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

export function isWeightUnit(unit: string): boolean {
  return normalizeUnit(unit) in WEIGHT_CONVERSIONS;
}

export function isVolumeUnit(unit: string): boolean {
  return normalizeUnit(unit) in VOLUME_CONVERSIONS;
}

export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return quantity;

  if (from in WEIGHT_CONVERSIONS && to in WEIGHT_CONVERSIONS) {
    return (quantity * WEIGHT_CONVERSIONS[from]) / WEIGHT_CONVERSIONS[to];
  }

  if (from in VOLUME_CONVERSIONS && to in VOLUME_CONVERSIONS) {
    return (quantity * VOLUME_CONVERSIONS[from]) / VOLUME_CONVERSIONS[to];
  }

  return null;
}

export function getCostLabelForUnit(unit: string): string {
  return isWeightUnit(unit) ? 'Cena za kg' : 'Cena za jednostke';
}
