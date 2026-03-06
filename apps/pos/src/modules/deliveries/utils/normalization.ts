import { StockItem } from '@/types/inventory';
import { convertQuantity, isWeightUnit } from '@/lib/utils/unit-conversion';

export type NormalizedDeliveryValues = {
  price_per_kg_net: number | null;
  quantity_received: number | null;
};

function resolveWeightPerSupplierUnit(
  stockItem: Pick<StockItem, 'purchase_unit_weight_kg'>,
  supplierUnit: string
): number | null {
  if (isWeightUnit(supplierUnit)) {
    return convertQuantity(1, supplierUnit, 'kg');
  }

  return stockItem.purchase_unit_weight_kg ?? null;
}

export function normalizeDeliveryValues(
  stockItem: Pick<StockItem, 'unit' | 'purchase_unit_weight_kg'>,
  supplierQuantityReceived: number | null,
  supplierUnit: string | null,
  unitPriceNet: number | null
): NormalizedDeliveryValues {
  if (supplierQuantityReceived == null || supplierUnit == null) {
    return {
      price_per_kg_net: null,
      quantity_received: null,
    };
  }

  let quantityReceived = convertQuantity(
    supplierQuantityReceived,
    supplierUnit,
    stockItem.unit
  );

  if (
    quantityReceived == null &&
    stockItem.unit === 'kg' &&
    stockItem.purchase_unit_weight_kg != null &&
    !isWeightUnit(supplierUnit)
  ) {
    quantityReceived = supplierQuantityReceived * stockItem.purchase_unit_weight_kg;
  }

  let pricePerKgNet: number | null = null;
  if (unitPriceNet != null && stockItem.unit === 'kg') {
    const weightPerSupplierUnit = resolveWeightPerSupplierUnit(stockItem, supplierUnit);
    if (weightPerSupplierUnit != null && weightPerSupplierUnit > 0) {
      pricePerKgNet = unitPriceNet / weightPerSupplierUnit;
    }
  }

  return {
    price_per_kg_net: pricePerKgNet,
    quantity_received: quantityReceived,
  };
}
