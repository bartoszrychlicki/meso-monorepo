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
      product_name: 'Ramen',
      quantity: 2,
      unit_price: 32,
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
  it('maps delivery orders with confirmUrl and flattened address', () => {
    const payload = mapOrderToPosbistroPayload(baseOrder, {
      callbackToken: 'callback-token-1',
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
    });

    expect(payload.confirmUrl).toBe(
      'https://pos.mesofood.pl/api/integrations/posbistro/confirm?token=callback-token-1'
    );
    expect(payload.orderId).toBe('order-1');
    expect(payload.orderNumber).toBe('WEB-20260310-001');
    expect(payload.fulfillmentType).toBe('delivery');
    expect(payload.customer).toEqual(
      expect.objectContaining({
        name: 'Jan Kowalski',
        phone: '+48123456789',
        email: 'jan@example.com',
      })
    );
    expect(payload.address).toEqual(
      expect.objectContaining({
        street: 'Prosta 1A',
        city: 'Warszawa',
        postalCode: '00-001',
      })
    );
  });

  it('maps pickup orders without delivery address and keeps item notes/modifiers', () => {
    const payload = mapOrderToPosbistroPayload(
      {
        ...baseOrder,
        id: 'order-2',
        delivery_type: 'pickup',
        delivery_address: undefined,
      },
      {
        callbackToken: 'callback-token-2',
        confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      }
    );

    expect(payload.fulfillmentType).toBe('pickup');
    expect(payload.address).toBeUndefined();
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        id: 'product-1',
        name: 'Ramen',
        quantity: 2,
        notes: 'Mniej ostre',
        modifiers: [
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
