import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ModifierAction,
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/types/enums';
import type { Order } from '@/types/order';
import type { PosbistroMenuMapping } from '../types';
import {
  PosbistroMenuMappingError,
  resolvePosbistroMappingsForOrder,
  upsertPosbistroMenuMapping,
} from '../menu-mapping';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    order_number: 'WEB-20260311-100',
    status: OrderStatus.CONFIRMED,
    channel: OrderChannel.DELIVERY_APP,
    source: OrderSource.DELIVERY,
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
        variant_id: 'variant-1',
        product_name: 'Ramen',
        quantity: 1,
        unit_price: 32,
        modifiers: [
          {
            modifier_id: 'modifier-1',
            name: 'Extra nori',
            price: 4,
            quantity: 1,
            modifier_action: ModifierAction.ADD,
          },
        ],
        subtotal: 36,
      },
    ],
    subtotal: 36,
    tax: 2.67,
    discount: 0,
    total: 36,
    payment_status: PaymentStatus.PAID,
    payment_method: PaymentMethod.ONLINE,
    notes: '',
    status_history: [],
    created_at: '2026-03-11T10:00:00.000Z',
    updated_at: '2026-03-11T10:00:00.000Z',
    ...overrides,
  };
}

function createMapping(overrides: Partial<PosbistroMenuMapping> = {}): PosbistroMenuMapping {
  return {
    id: crypto.randomUUID(),
    mapping_type: 'product',
    meso_product_id: 'product-1',
    meso_variant_id: null,
    meso_modifier_id: null,
    posbistro_product_type: 'SIMPLE',
    posbistro_variation_id: 'pb-variation-1',
    posbistro_variation_sku: null,
    posbistro_addon_id: null,
    posbistro_addon_sku: null,
    posbistro_name: 'POSBistro Ramen',
    notes: null,
    is_active: true,
    created_at: '2026-03-11T10:00:00.000Z',
    updated_at: '2026-03-11T10:00:00.000Z',
    ...overrides,
  };
}

describe('resolvePosbistroMappingsForOrder', () => {
  const mappingRepo = {
    findAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves variant and modifier mappings for order items', async () => {
    mappingRepo.findAll.mockResolvedValue({
      data: [
        createMapping({
          mapping_type: 'variant',
          meso_variant_id: 'variant-1',
          posbistro_variation_id: 'pb-variant-1',
        }),
        createMapping({
          mapping_type: 'modifier',
          meso_product_id: null,
          meso_variant_id: null,
          meso_modifier_id: 'modifier-1',
          posbistro_product_type: null,
          posbistro_variation_id: null,
          posbistro_addon_id: 'pb-addon-1',
        }),
      ],
      total: 2,
      page: 1,
      per_page: 1000,
      total_pages: 1,
    });

    const result = await resolvePosbistroMappingsForOrder(createOrder(), {
      mappingRepo: mappingRepo as never,
    });

    expect(result.itemMappings['item-1']).toEqual(
      expect.objectContaining({
        productType: 'SIMPLE',
        variationId: 'pb-variant-1',
      })
    );
    expect(result.itemMappings['item-1']?.modifierMappings['modifier-1']).toEqual(
      expect.objectContaining({
        addonId: 'pb-addon-1',
      })
    );
  });

  it('throws a descriptive error when product mapping is missing', async () => {
    mappingRepo.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 1000,
      total_pages: 0,
    });

    await expect(
      resolvePosbistroMappingsForOrder(createOrder({ items: [{ ...createOrder().items[0], variant_id: undefined }] }), {
        mappingRepo: mappingRepo as never,
      })
    ).rejects.toMatchObject({
      name: 'PosbistroMenuMappingError',
      details: expect.objectContaining({
        meso_product_id: 'product-1',
      }),
    });
  });
});

describe('upsertPosbistroMenuMapping', () => {
  const mappingRepo = {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new mapping when none exists', async () => {
    mappingRepo.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 1000,
      total_pages: 0,
    });
    mappingRepo.create.mockResolvedValue(
      createMapping({
        mapping_type: 'product',
      })
    );

    const result = await upsertPosbistroMenuMapping(
      {
        mapping_type: 'product',
        meso_product_id: 'product-1',
        meso_variant_id: null,
        meso_modifier_id: null,
        posbistro_product_type: 'SIMPLE',
        posbistro_variation_id: 'pb-variation-1',
        posbistro_variation_sku: null,
        posbistro_addon_id: null,
        posbistro_addon_sku: null,
        posbistro_name: 'POSBistro Ramen',
        notes: null,
        is_active: true,
      },
      {
        mappingRepo: mappingRepo as never,
      }
    );

    expect(mappingRepo.create).toHaveBeenCalledTimes(1);
    expect(result.posbistro_variation_id).toBe('pb-variation-1');
  });

  it('updates an existing mapping for the same entity', async () => {
    mappingRepo.findAll.mockResolvedValue({
      data: [
        createMapping({
          id: 'mapping-1',
          mapping_type: 'variant',
          meso_variant_id: 'variant-1',
          posbistro_variation_id: 'pb-old',
        }),
      ],
      total: 1,
      page: 1,
      per_page: 1000,
      total_pages: 1,
    });
    mappingRepo.update.mockResolvedValue(
      createMapping({
        id: 'mapping-1',
        mapping_type: 'variant',
        meso_variant_id: 'variant-1',
        posbistro_variation_id: 'pb-new',
      })
    );

    const result = await upsertPosbistroMenuMapping(
      {
        mapping_type: 'variant',
        meso_product_id: 'product-1',
        meso_variant_id: 'variant-1',
        meso_modifier_id: null,
        posbistro_product_type: 'SIMPLE',
        posbistro_variation_id: 'pb-new',
        posbistro_variation_sku: null,
        posbistro_addon_id: null,
        posbistro_addon_sku: null,
        posbistro_name: null,
        notes: 'updated',
        is_active: true,
      },
      {
        mappingRepo: mappingRepo as never,
      }
    );

    expect(mappingRepo.update).toHaveBeenCalledWith(
      'mapping-1',
      expect.objectContaining({
        posbistro_variation_id: 'pb-new',
      })
    );
    expect(result.id).toBe('mapping-1');
  });
});
