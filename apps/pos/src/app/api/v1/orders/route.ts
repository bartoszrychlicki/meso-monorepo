import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { ordersRepository } from '@/modules/orders/repository';
import { productsRepository } from '@/modules/menu/repository';
import { createServiceClient } from '@/lib/supabase/server';
import { CreateOrderSchema } from '@/schemas/order';
import { OrderChannel, OrderStatus, PaymentStatus } from '@/types/enums';
import { Product } from '@/types/menu';
import { Order } from '@/types/order';
import { KitchenItem } from '@/types/kitchen';

type PersistedOrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  spice_level: number | null;
  variant_name?: string;
  addons: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    modifier_action: string;
  }>;
  notes?: string;
};

type RpcErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function asRpcError(value: unknown): RpcErrorLike {
  return (value ?? {}) as RpcErrorLike;
}

function isExternalIdUniqueViolation(error: unknown): boolean {
  const rpcError = asRpcError(error);
  if (rpcError.code !== '23505') return false;
  const context = [rpcError.message, rpcError.details, rpcError.hint]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLowerCase();
  return context.includes('external_order_id');
}

const VAT_RATE = 0.08;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateIncludedTaxFromGross(grossAmount: number, rate: number): number {
  if (grossAmount <= 0) return 0;
  return roundCurrency(grossAmount - grossAmount / (1 + rate));
}

async function findExistingByExternalOrderId(
  externalOrderId: string
): Promise<Order | null> {
  const existing = await ordersRepository.findMany(
    (order) => order.external_order_id === externalOrderId
  );
  return existing[0] ?? null;
}

/**
 * GET /api/v1/orders
 * List orders with optional filtering.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'orders:read');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '50', 10), 100);
  const status = searchParams.get('status') as OrderStatus | null;
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const customer = searchParams.get('customer');

  // Use specific filters if provided
  if (status && Object.values(OrderStatus).includes(status)) {
    const orders = await ordersRepository.findByStatus(status);
    const start = (page - 1) * perPage;
    const paged = orders.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: orders.length,
      page,
      per_page: perPage,
    });
  }

  if (dateFrom && dateTo) {
    const orders = await ordersRepository.findByDateRange(dateFrom, dateTo);
    const start = (page - 1) * perPage;
    const paged = orders.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: orders.length,
      page,
      per_page: perPage,
    });
  }

  if (customer) {
    const orders = await ordersRepository.findByCustomer(customer);
    const start = (page - 1) * perPage;
    const paged = orders.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: orders.length,
      page,
      per_page: perPage,
    });
  }

  const result = await ordersRepository.findAll({
    page,
    per_page: perPage,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  return apiSuccess(result.data, {
    total: result.total,
    page: result.page,
    per_page: result.per_page,
  });
}

/**
 * POST /api/v1/orders
 * Create a new order.
 * Uses service role client (bypasses RLS) since API routes authenticate via API key.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'orders:write');
  if (!isApiKey(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = CreateOrderSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const input = validation.data;
  const now = new Date().toISOString();
  const serviceClient = createServiceClient();

  // Fast path for idempotency key.
  if (input.external_order_id) {
    const existing = await findExistingByExternalOrderId(input.external_order_id);
    if (existing) {
      return apiSuccess(existing);
    }
  }

  // Validate that all products exist and are available
  const uniqueProductIds = [...new Set(input.items.map((item) => item.product_id))];
  const productMap = new Map<string, Product>();

  for (const productId of uniqueProductIds) {
    const product = await productsRepository.findById(productId);
    if (!product) {
      return apiValidationError([
        {
          field: 'items.product_id',
          message: `Produkt (id: ${productId}) nie istnieje`,
        },
      ]);
    }
    if (!product.is_available) {
      return apiValidationError([
        {
          field: 'items.product_id',
          message: `Produkt '${product.name}' (id: ${productId}) nie jest dostępny`,
        },
      ]);
    }
    productMap.set(productId, product);
  }

  // Validate variant_id references
  for (const item of input.items) {
    if (item.variant_id) {
      const product = productMap.get(item.product_id)!;
      const variant = product.variants?.find((v) => v.id === item.variant_id);
      if (!variant) {
        return apiValidationError([
          {
            field: 'items.variant_id',
            message: `Wariant '${item.variant_id}' nie istnieje w produkcie '${product.name}' (id: ${item.product_id})`,
          },
        ]);
      }
      if (!variant.is_available) {
        return apiValidationError([
          {
            field: 'items.variant_id',
            message: `Wariant '${variant.name}' w produkcie '${product.name}' nie jest dostępny`,
          },
        ]);
      }
    }
  }

  const { data: nextNumber, error: numberError } = await serviceClient.rpc(
    'next_order_number',
    { p_channel: input.channel }
  );
  if (numberError || typeof nextNumber !== 'string' || nextNumber.length === 0) {
    return apiError(
      'ORDER_NUMBER_GENERATION_FAILED',
      'Nie udało się wygenerować numeru zamówienia',
      500,
      numberError ? [numberError] : undefined
    );
  }
  const orderNumber = nextNumber;

  // Calculate totals from items
  const items = input.items.map((item) => {
    const modifiersTotal = item.modifiers.reduce(
      (sum, m) => sum + m.price * m.quantity,
      0
    );
    const subtotal = item.quantity * (item.unit_price + modifiersTotal);
    return {
      ...item,
      id: crypto.randomUUID(),
      subtotal,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  // Menu prices are gross. VAT is informational only and already included in subtotal.
  const tax = calculateIncludedTaxFromGross(subtotal, VAT_RATE);
  const discount = input.discount ?? 0;
  const deliveryFee = input.delivery_fee ?? 0;
  const tip = input.tip ?? 0;
  const total = roundCurrency(subtotal - discount + deliveryFee + tip);

  // Delivery app orders with pre-paid or pay-on-pickup status start as CONFIRMED
  const isDeliveryConfirmed =
    input.channel === OrderChannel.DELIVERY_APP &&
    (input.payment_status === PaymentStatus.PAID ||
     input.payment_status === PaymentStatus.PAY_ON_PICKUP);

  const initialStatus = isDeliveryConfirmed
    ? OrderStatus.CONFIRMED
    : OrderStatus.PENDING;
  const initialPaymentStatus = isDeliveryConfirmed
    ? (input.payment_status ?? PaymentStatus.PENDING)
    : PaymentStatus.PENDING;
  const statusNote = isDeliveryConfirmed
    ? 'Zamówienie z delivery app (potwierdzone)'
    : 'Zamówienie utworzone przez API';

  const orderPayload = {
    order_number: orderNumber,
    status: initialStatus,
    channel: input.channel,
    source: input.source,
    location_id: input.location_id,
    customer_id: input.customer_id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    delivery_address: input.delivery_address,
    items,
    subtotal,
    tax,
    discount,
    delivery_fee: deliveryFee || undefined,
    tip: tip || undefined,
    total,
    payment_method: input.payment_method,
    payment_status: initialPaymentStatus,
    notes: input.notes,
    status_history: [
      {
        status: initialStatus,
        timestamp: now,
        note: statusNote,
      },
    ],
    external_order_id: input.external_order_id,
    external_channel: input.external_channel,
    metadata: input.metadata,
    promo_code: input.promo_code,
    delivery_type: input.delivery_type,
    scheduled_time: input.scheduled_time,
    confirmed_at: isDeliveryConfirmed ? now : undefined,
    paid_at: input.payment_status === PaymentStatus.PAID ? now : undefined,
  };

  // Relational rows are inserted transactionally inside RPC.
  const persistedItems: PersistedOrderItem[] = items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.subtotal,
    spice_level: null,
    variant_name: item.variant_name,
    addons: (item.modifiers || []).map((modifier) => ({
      id: modifier.modifier_id,
      name: modifier.name,
      price: modifier.price,
      quantity: modifier.quantity,
      modifier_action: modifier.modifier_action,
    })),
    notes: item.notes,
  }));

  const kitchenItems: KitchenItem[] = items.map((item) => ({
    id: crypto.randomUUID(),
    order_item_id: item.id,
    product_name: item.product_name,
    variant_name: item.variant_name,
    quantity: item.quantity,
    modifiers: (item.modifiers || []).map((m) => m.name),
    notes: item.notes,
    is_done: false,
  }));
  const kitchenTicketPayload = {
    order_number: orderNumber,
    location_id: input.location_id,
    status: OrderStatus.PENDING,
    items: kitchenItems,
    priority: 0,
    estimated_minutes: Math.max(5, kitchenItems.length * 4),
    notes: input.notes,
  };

  try {
    const { data: createdOrderData, error: createError } = await serviceClient.rpc(
      'create_order_with_items',
      {
        p_order: orderPayload,
        p_order_items: persistedItems,
        p_kitchen_ticket: kitchenTicketPayload,
      }
    );

    if (createError) {
      throw createError;
    }

    const order = (Array.isArray(createdOrderData)
      ? createdOrderData[0]
      : createdOrderData) as Order | null;

    if (!order) {
      return apiError(
        'ORDER_CREATE_FAILED',
        'Nie udało się utworzyć zamówienia',
        500
      );
    }

    return apiCreated(order);
  } catch (error) {
    if (input.external_order_id && isExternalIdUniqueViolation(error)) {
      const existing = await findExistingByExternalOrderId(input.external_order_id);
      if (existing) {
        return apiSuccess(existing);
      }
    }

    return apiError(
      'ORDER_CREATE_FAILED',
      'Nie udało się utworzyć zamówienia',
      500,
      [asRpcError(error)]
    );
  }
}
