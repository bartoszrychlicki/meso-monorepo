import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderChannel, OrderStatus, PaymentStatus } from '@/types/enums';
import type { Order } from '@/types/order';
import type { PosbistroOrderIntegration } from '../types';
import {
  ensureCustomerForOrder,
  ensureCustomerForOrderDraft,
  getNextRetryAt,
  handlePosbistroConfirmation,
  submitPosbistroOrder,
  retryPendingPosbistroExports,
} from '../service';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
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
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: 'jan@example.com',
      houseNumber: '1A',
    },
    items: [
      {
        id: 'item-1',
        product_id: 'product-1',
        product_name: 'Ramen',
        quantity: 1,
        unit_price: 32,
        modifiers: [],
        subtotal: 32,
      },
    ],
    subtotal: 32,
    tax: 2.37,
    discount: 0,
    total: 32,
    payment_status: PaymentStatus.PAID,
    notes: '',
    status_history: [],
    created_at: '2026-03-10T10:00:00.000Z',
    updated_at: '2026-03-10T10:00:00.000Z',
    ...overrides,
  };
}

function createIntegration(
  overrides: Partial<PosbistroOrderIntegration> = {}
): PosbistroOrderIntegration {
  return {
    id: 'integration-1',
    order_id: 'order-1',
    status: 'pending',
    callback_token: 'token-1',
    request_payload: null,
    response_payload: null,
    attempts: 0,
    last_error: null,
    next_retry_at: null,
    posbistro_order_id: null,
    confirmed_at: null,
    rejected_at: null,
    rejection_reason: null,
    created_at: '2026-03-10T10:00:00.000Z',
    updated_at: '2026-03-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('submitPosbistroOrder', () => {
  const integrationRepo = {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn(),
  };
  const mappingRepo = {
    findAll: vi.fn(),
  };
  const client = {
    submitOrder: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mappingRepo.findAll.mockResolvedValue({
      data: [
        {
          id: 'mapping-variant-1',
          mapping_type: 'product',
          meso_product_id: 'product-1',
          meso_variant_id: null,
          meso_modifier_id: null,
          posbistro_product_type: 'SIMPLE',
          posbistro_variation_id: 'pb-variation-1',
          posbistro_variation_sku: null,
          posbistro_addon_id: null,
          posbistro_addon_sku: null,
          posbistro_name: null,
          notes: null,
          is_active: true,
          created_at: '2026-03-10T10:00:00.000Z',
          updated_at: '2026-03-10T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      per_page: 1000,
      total_pages: 1,
    });
  });

  it('creates integration record and submits order once', async () => {
    integrationRepo.findMany.mockResolvedValue([]);
    integrationRepo.create.mockResolvedValue(createIntegration());
    integrationRepo.update
      .mockResolvedValueOnce(createIntegration({ status: 'sending', attempts: 1 }))
      .mockResolvedValueOnce(
        createIntegration({
          status: 'submitted',
          attempts: 1,
          posbistro_order_id: 'pb-100',
        })
      );
    client.submitOrder.mockResolvedValue({
      status: true,
      data: {
        orderId: 'pb-100',
      },
    });

    const result = await submitPosbistroOrder(createOrder(), {
      integrationRepo: integrationRepo as never,
      mappingRepo: mappingRepo as never,
      client: client as never,
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      now: () => new Date('2026-03-10T10:00:00.000Z'),
      randomUUID: () => 'token-1',
    });

    expect(integrationRepo.create).toHaveBeenCalledTimes(1);
    expect(client.submitOrder).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('submitted');
    expect(result.posbistro_order_id).toBe('pb-100');
  });

  it('does not export again when integration is already submitted', async () => {
    integrationRepo.findMany.mockResolvedValue([
      createIntegration({ status: 'submitted', posbistro_order_id: 'pb-100' }),
    ]);

    const result = await submitPosbistroOrder(createOrder(), {
      integrationRepo: integrationRepo as never,
      mappingRepo: mappingRepo as never,
      client: client as never,
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      now: () => new Date('2026-03-10T10:00:00.000Z'),
      randomUUID: () => 'token-1',
    });

    expect(client.submitOrder).not.toHaveBeenCalled();
    expect(result.status).toBe('submitted');
  });

  it('stores retry metadata when submit fails', async () => {
    integrationRepo.findMany.mockResolvedValue([]);
    integrationRepo.create.mockResolvedValue(createIntegration());
    integrationRepo.update
      .mockResolvedValueOnce(createIntegration({ status: 'sending', attempts: 1 }))
      .mockResolvedValueOnce(
        createIntegration({
          status: 'failed',
          attempts: 1,
          last_error: 'timeout',
          next_retry_at: '2026-03-10T10:00:30.000Z',
        })
      );
    client.submitOrder.mockRejectedValue(new Error('timeout'));

    const result = await submitPosbistroOrder(createOrder(), {
      integrationRepo: integrationRepo as never,
      mappingRepo: mappingRepo as never,
      client: client as never,
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      now: () => new Date('2026-03-10T10:00:00.000Z'),
      randomUUID: () => 'token-1',
    });

    expect(result.status).toBe('failed');
    expect(result.next_retry_at).toBe('2026-03-10T10:00:30.000Z');
  });

  it('stores POSBistro validation error details when API rejects payload logically', async () => {
    integrationRepo.findMany.mockResolvedValue([]);
    integrationRepo.create.mockResolvedValue(createIntegration());
    integrationRepo.update
      .mockResolvedValueOnce(createIntegration({ status: 'sending', attempts: 1 }))
      .mockResolvedValueOnce(
        createIntegration({
          status: 'failed',
          attempts: 1,
          last_error: 'POSBistro order submit rejected: invalid_cart_param - Missing products',
          response_payload: {
            code: 'invalid_cart_param',
            message: ['Missing products'],
            status: false,
          },
          next_retry_at: '2026-03-10T10:00:30.000Z',
        })
      );
    client.submitOrder.mockRejectedValue(
      Object.assign(new Error('POSBistro order submit rejected: invalid_cart_param - Missing products'), {
        responseBody: {
          status: false,
          code: 'invalid_cart_param',
          message: ['Missing products'],
        },
      })
    );

    const result = await submitPosbistroOrder(createOrder(), {
      integrationRepo: integrationRepo as never,
      mappingRepo: mappingRepo as never,
      client: client as never,
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      now: () => new Date('2026-03-10T10:00:00.000Z'),
      randomUUID: () => 'token-1',
    });

    expect(result.status).toBe('failed');
    expect(result.response_payload).toEqual(
      expect.objectContaining({
        code: 'invalid_cart_param',
        status: false,
      })
    );
  });

  it('fails without retry when POSBistro menu mapping is missing', async () => {
    integrationRepo.findMany.mockResolvedValue([]);
    integrationRepo.create.mockResolvedValue(createIntegration());
    integrationRepo.update.mockResolvedValue(
      createIntegration({
        status: 'failed',
        attempts: 1,
        last_error: 'Missing POSBistro product mapping for "Ramen" (product-1)',
        response_payload: {
          code: 'missing_posbistro_mapping',
        },
        next_retry_at: null,
      })
    );
    mappingRepo.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 1000,
      total_pages: 0,
    });

    const result = await submitPosbistroOrder(createOrder({ items: [{ ...createOrder().items[0], variant_id: undefined }] }), {
      integrationRepo: integrationRepo as never,
      mappingRepo: mappingRepo as never,
      client: client as never,
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      now: () => new Date('2026-03-10T10:00:00.000Z'),
      randomUUID: () => 'token-1',
    });

    expect(client.submitOrder).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
    expect(result.next_retry_at).toBeNull();
  });
});

describe('handlePosbistroConfirmation', () => {
  const integrationRepo = {
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const orderRepo = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks integration as accepted', async () => {
    integrationRepo.findMany.mockResolvedValue([createIntegration({ status: 'submitted' })]);
    orderRepo.findById.mockResolvedValue(createOrder());
    integrationRepo.update.mockResolvedValue(
      createIntegration({
        status: 'accepted',
        confirmed_at: '2026-03-10T10:05:00.000Z',
        posbistro_order_id: 'pb-100',
      })
    );

    const result = await handlePosbistroConfirmation(
      {
        status: 'accepted',
        orderId: 'pb-100',
      },
      {
        token: 'token-1',
        integrationRepo: integrationRepo as never,
        orderRepo: orderRepo as never,
        now: () => new Date('2026-03-10T10:05:00.000Z'),
      }
    );

    expect(result.integration.status).toBe('accepted');
    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  it('marks integration as rejected and cancels order once', async () => {
    integrationRepo.findMany.mockResolvedValue([createIntegration({ status: 'submitted' })]);
    orderRepo.findById.mockResolvedValue(createOrder());
    integrationRepo.update.mockResolvedValue(
      createIntegration({
        status: 'rejected',
        rejected_at: '2026-03-10T10:05:00.000Z',
        rejection_reason: 'Restauracja zamknięta',
      })
    );
    orderRepo.update.mockResolvedValue(
      createOrder({
        status: OrderStatus.CANCELLED,
        status_history: [
          {
            status: OrderStatus.CANCELLED,
            timestamp: '2026-03-10T10:05:00.000Z',
            note: 'POSBistro: Restauracja zamknięta',
          },
        ],
      })
    );

    const result = await handlePosbistroConfirmation(
      {
        status: 'rejected',
        reason: 'Restauracja zamknięta',
      },
      {
        token: 'token-1',
        integrationRepo: integrationRepo as never,
        orderRepo: orderRepo as never,
        now: () => new Date('2026-03-10T10:05:00.000Z'),
      }
    );

    expect(result.integration.status).toBe('rejected');
    expect(orderRepo.update).toHaveBeenCalledTimes(1);
    expect(orderRepo.update).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({
        status: OrderStatus.CANCELLED,
      })
    );
  });

  it('is idempotent for repeated callbacks', async () => {
    integrationRepo.findMany.mockResolvedValue([createIntegration({ status: 'accepted' })]);
    orderRepo.findById.mockResolvedValue(createOrder());

    const result = await handlePosbistroConfirmation(
      {
        status: 'accepted',
        orderId: 'pb-100',
      },
      {
        token: 'token-1',
        integrationRepo: integrationRepo as never,
        orderRepo: orderRepo as never,
        now: () => new Date('2026-03-10T10:05:00.000Z'),
      }
    );

    expect(result.integration.status).toBe('accepted');
    expect(integrationRepo.update).not.toHaveBeenCalled();
  });
});

describe('customer upsert helpers', () => {
  const customerRepo = {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const orderRepo = {
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches existing customer by phone on draft orders', async () => {
    customerRepo.findMany.mockResolvedValueOnce([
      { id: 'customer-1', phone: '+48123456789', email: null },
    ]);

    const result = await ensureCustomerForOrderDraft(
      {
        channel: OrderChannel.DELIVERY_APP,
        source: 'delivery',
        location_id: 'location-1',
        customer_phone: '+48123456789',
        customer_name: 'Jan Kowalski',
        items: [
          {
            product_id: 'product-1',
            product_name: 'Ramen',
            quantity: 1,
            unit_price: 32,
            modifiers: [],
          },
        ],
      },
      {
        customerRepo: customerRepo as never,
        now: () => new Date('2026-03-10T10:00:00.000Z'),
      }
    );

    expect(result.customer_id).toBe('customer-1');
    expect(customerRepo.create).not.toHaveBeenCalled();
  });

  it('falls back to email and updates missing fields on persisted orders', async () => {
    customerRepo.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'customer-1',
          phone: '+48123456789',
          email: null,
          first_name: 'Jan',
          last_name: 'Kowalski',
          addresses: [],
        },
      ]);
    customerRepo.update.mockResolvedValue({
      id: 'customer-1',
      email: 'jan@example.com',
    });
    orderRepo.update.mockResolvedValue(
      createOrder({
        customer_id: 'customer-1',
      })
    );

    const result = await ensureCustomerForOrder(createOrder(), {
      customerRepo: customerRepo as never,
      orderRepo: orderRepo as never,
      now: () => new Date('2026-03-10T10:00:00.000Z'),
    });

    expect(customerRepo.update).toHaveBeenCalledTimes(1);
    expect(result.customer_id).toBe('customer-1');
  });

  it('creates customer when none exists', async () => {
    customerRepo.findMany.mockResolvedValue([]);
    customerRepo.create.mockResolvedValue({ id: 'customer-2' });
    orderRepo.update.mockResolvedValue(
      createOrder({
        customer_id: 'customer-2',
      })
    );

    const result = await ensureCustomerForOrder(createOrder(), {
      customerRepo: customerRepo as never,
      orderRepo: orderRepo as never,
      now: () => new Date('2026-03-10T10:00:00.000Z'),
    });

    expect(customerRepo.create).toHaveBeenCalledTimes(1);
    expect(result.customer_id).toBe('customer-2');
  });
});

describe('retryPendingPosbistroExports', () => {
  const integrationRepo = {
    findAll: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const orderRepo = {
    findById: vi.fn(),
  };
  const client = {
    submitOrder: vi.fn(),
  };
  const mappingRepo = {
    findAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mappingRepo.findAll.mockResolvedValue({
      data: [
        {
          id: 'mapping-1',
          mapping_type: 'product',
          meso_product_id: 'product-1',
          meso_variant_id: null,
          meso_modifier_id: null,
          posbistro_product_type: 'SIMPLE',
          posbistro_variation_id: 'pb-variation-1',
          posbistro_variation_sku: null,
          posbistro_addon_id: null,
          posbistro_addon_sku: null,
          posbistro_name: null,
          notes: null,
          is_active: true,
          created_at: '2026-03-10T10:00:00.000Z',
          updated_at: '2026-03-10T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      per_page: 1000,
      total_pages: 1,
    });
  });

  it('retries only due records and updates counters', async () => {
    integrationRepo.findAll.mockResolvedValue({
      data: [
        createIntegration({
          id: 'integration-1',
          status: 'failed',
          attempts: 1,
          next_retry_at: '2026-03-10T10:00:00.000Z',
        }),
      ],
      total: 1,
      page: 1,
      per_page: 100,
      total_pages: 1,
    });
    integrationRepo.findMany.mockResolvedValue([
      createIntegration({
        id: 'integration-1',
        status: 'failed',
        attempts: 1,
        next_retry_at: '2026-03-10T10:00:00.000Z',
      }),
    ]);
    orderRepo.findById.mockResolvedValue(createOrder());
    integrationRepo.update
      .mockResolvedValueOnce(createIntegration({ status: 'sending', attempts: 2 }))
      .mockResolvedValueOnce(createIntegration({ status: 'submitted', attempts: 2 }));
    client.submitOrder.mockResolvedValue({ orderId: 'pb-100' });

    const result = await retryPendingPosbistroExports({
      integrationRepo: integrationRepo as never,
      orderRepo: orderRepo as never,
      mappingRepo: mappingRepo as never,
      client: client as never,
      confirmBaseUrl: 'https://pos.mesofood.pl/api/integrations/posbistro/confirm',
      now: () => new Date('2026-03-10T10:00:00.000Z'),
    });

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(client.submitOrder).toHaveBeenCalledTimes(1);
  });

  it('computes exponential retry backoff', () => {
    expect(getNextRetryAt(new Date('2026-03-10T10:00:00.000Z'), 1).toISOString()).toBe(
      '2026-03-10T10:00:30.000Z'
    );
    expect(getNextRetryAt(new Date('2026-03-10T10:00:00.000Z'), 5).toISOString()).toBe(
      '2026-03-10T11:00:00.000Z'
    );
  });
});
