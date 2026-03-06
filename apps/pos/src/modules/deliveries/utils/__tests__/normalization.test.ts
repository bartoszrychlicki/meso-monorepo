import { describe, expect, it } from 'vitest';
import { normalizeDeliveryValues } from '../normalization';

describe('normalizeDeliveryValues', () => {
  it('keeps weight-based supplier quantities unchanged for kg stock items', () => {
    expect(
      normalizeDeliveryValues(
        {
          unit: 'kg',
          purchase_unit_weight_kg: null,
        },
        5,
        'kg',
        18
      )
    ).toEqual({
      price_per_kg_net: 18,
      quantity_received: 5,
    });
  });

  it('normalizes package deliveries to kg using purchase unit weight', () => {
    expect(
      normalizeDeliveryValues(
        {
          unit: 'kg',
          purchase_unit_weight_kg: 2.5,
        },
        10,
        'op',
        45
      )
    ).toEqual({
      price_per_kg_net: 18,
      quantity_received: 25,
    });
  });

  it('returns null normalized values when package weight is missing', () => {
    expect(
      normalizeDeliveryValues(
        {
          unit: 'kg',
          purchase_unit_weight_kg: null,
        },
        10,
        'op',
        45
      )
    ).toEqual({
      price_per_kg_net: null,
      quantity_received: null,
    });
  });
});
