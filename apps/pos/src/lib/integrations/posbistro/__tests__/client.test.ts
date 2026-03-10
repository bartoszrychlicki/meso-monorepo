import { describe, expect, it, vi } from 'vitest';
import { PosbistroClient, PosbistroSubmitError } from '../client';

describe('PosbistroClient', () => {
  it('throws when POSBistro returns business validation error in 200 response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: false,
          code: 'invalid_cart_param',
          message: ['.confirmUrl format should match format "url"'],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );
    const client = new PosbistroClient({
      baseUrl: 'https://api.posbistro.com',
      apiKey: 'test-key',
      fetchImpl,
    });

    await expect(
      client.submitOrder({
        id: 'order-1',
        orderType: 'ORDER',
        source: 'DELIVERY',
        paymentInfo: {
          paymentType: 'ONLINE',
          paid: true,
        },
        deliveryType: 'DELIVERY',
        requestedDate: null,
        price: 12,
        originalPrice: 12,
        confirmUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm?token=1',
        client: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'jan@example.com',
          phone: '+48123456789',
        },
        products: [],
      })
    ).rejects.toMatchObject<Partial<PosbistroSubmitError>>({
      name: 'PosbistroSubmitError',
      responseBody: expect.objectContaining({
        code: 'invalid_cart_param',
        status: false,
      }),
    });
  });

  it('returns parsed response for successful submit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          code: 'ok',
          data: {
            orderId: 'pb-100',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );
    const client = new PosbistroClient({
      baseUrl: 'https://api.posbistro.com',
      apiKey: 'test-key',
      fetchImpl,
    });

    const result = await client.submitOrder({
      id: 'order-1',
      orderType: 'ORDER',
      source: 'DELIVERY',
      paymentInfo: {
        paymentType: 'ONLINE',
        paid: true,
      },
      deliveryType: 'DELIVERY',
      requestedDate: null,
      price: 12,
      originalPrice: 12,
      confirmUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm?token=1',
      client: {
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan@example.com',
        phone: '+48123456789',
      },
      products: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: true,
        code: 'ok',
        data: {
          orderId: 'pb-100',
        },
      })
    );
  });
});
