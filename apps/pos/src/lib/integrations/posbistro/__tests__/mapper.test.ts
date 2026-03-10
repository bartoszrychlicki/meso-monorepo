import { describe, expect, it } from 'vitest';
import { OrderChannel, OrderStatus, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import { mapOrderToPosbistroPayload } from '../mapper';

const baseOrder: Order = {
  id: 'order-1',
  order_number: 'WEB-20260310-001',
  status: OrderStatus.CONFIRMED,
  channel: OrderChannel.DELIVERY_APP,
  source: 'delivery',
  location_id: 'location-1',
  customer_name: 'Jan Kowalski',
  customer_phone: '+48123456789',
  delivery_address: {
    street: 'Prosta',
    city: 'Warszawa',
    postal_code: '00-001',
    country: 'PL',
    houseNumber: '1A',
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan@example.com',
  },
  items: [
    {
      id: 'item-1',
      product_id: 'product-1',
      variant_id: 'variant-1',
      variant_name: 'Duzy',
      product_name: 'Ramen',
      quantity: 2,
      unit_price: 32,
      original_unit_price: 35,
      promotion_label: 'Lunch promo',
      modifiers: [
        {
          modifier_id: 'mod-1',
          name: 'Extra jajko',
          price: 4,
          quantity: 1,
          modifier_action: 'add',
        },
      ],
      subtotal: 72,
      notes: 'Mniej ostre',
    },
  ],
  subtotal: 72,
  tax: 5.33,
  discount: 0,
  total: 72,
  payment_status: PaymentStatus.PAID,
  payment_method: 'online',
  notes: 'Zadzwonić domofonem',
  status_history: [],
  created_at: '2026-03-10T10:00:00.000Z',
  updated_at: '2026-03-10T10:00:00.000Z',
};

describe('mapOrderToPosbistroPayload', () => {
  it('maps delivery orders to POSBistro cart schema', () => {
    const payload = mapOrderToPosbistroPayload(baseOrder, {
      callbackToken: 'callback-token-1',
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
    });

    expect(payload.id).toBe('order-1');
    expect(payload.orderType).toBe('ORDER');
    expect(payload.source).toBe('DELIVERY');
    expect(payload.deliveryType).toBe('DELIVERY');
    expect(payload.price).toBe(72);
    expect(payload.originalPrice).toBe(78);
    expect(payload.confirmUrl).toBe(
      'https://pos.mesofood.pl/api/integrations/posbistro/confirm?token=callback-token-1'
    );
    expect(payload.paymentInfo).toEqual(
      expect.objectContaining({
        paymentType: 'ONLINE',
        paid: true,
        provider: 'PRZELEWY24',
      })
    );
    expect(payload.client).toEqual(
      expect.objectContaining({
        firstName: 'Jan',
        lastName: 'Kowalski',
        phone: '+48123456789',
        email: 'jan@example.com',
      })
    );
    expect(payload.deliveryAddress).toEqual(
      expect.objectContaining({
        street: 'Prosta',
        streetNumber: '1A',
        city: 'Warszawa',
        postCode: '00-001',
      })
    );
    expect(payload.products[0]).toEqual(
      expect.objectContaining({
        id: 'item-1',
        productType: 'SIMPLE',
        variationId: 'variant-1',
        variationName: 'Duzy',
        name: 'Ramen',
        quantity: 2,
        price: 72,
        originalPrice: 78,
        promotionName: 'Lunch promo',
        comment: 'Mniej ostre',
        keepIncludedAddons: false,
      })
    );
    expect(payload.products[0]?.addons).toEqual([
      expect.objectContaining({
        id: 'mod-1',
        addonType: 'ADDED',
        addonId: 'mod-1',
        name: 'Extra jajko',
        quantity: 1,
        price: 4,
        originalPrice: 4,
      }),
    ]);
  });

  it('maps pickup orders without delivery address and with requestedDate when scheduled', () => {
    const payload = mapOrderToPosbistroPayload(
      {
        ...baseOrder,
        id: 'order-2',
        delivery_type: 'pickup',
        scheduled_time: '2026-03-10T12:30:00.000Z',
        delivery_address: undefined,
      },
      {
        callbackToken: 'callback-token-2',
        confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      }
    );

    expect(payload.deliveryType).toBe('TAKEAWAY');
    expect(payload.deliveryAddress).toBeUndefined();
    expect(payload.requestedDate).toBe('2026-03-10T12:30:00.000Z');
    expect(payload.products[0]).toEqual(
      expect.objectContaining({
        id: 'item-1',
        name: 'Ramen',
        quantity: 2,
        comment: 'Mniej ostre',
        addons: [
          expect.objectContaining({
            id: 'mod-1',
            name: 'Extra jajko',
            price: 4,
            quantity: 1,
          }),
        ],
      })
    );
  });
});
