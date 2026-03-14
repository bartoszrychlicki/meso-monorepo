import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import {
  buildPosbistroConfirmBaseUrl,
  ensureCustomerForOrderDraft,
  submitPosbistroOrder,
} from '@/lib/integrations/posbistro/service';
import { calculateOrderTotal, readMetadataPaymentFee, roundCurrency } from '@/lib/orders/financials';
import { buildOrderStatusChangedWebhookData } from '@/lib/webhooks/order-payload';
import { scheduleWebhookDispatch } from '@/lib/webhooks/schedule';
import { createServiceClient } from '@/lib/supabase/server';
import { estimateOrderLoyaltyPoints } from '@/modules/orders/server-loyalty';
import { CreateOrderSchema } from '@/schemas/order';
import { OrderChannel, OrderStatus, PaymentStatus } from '@/types/enums';
import type { Product } from '@/types/menu';
import type { Order } from '@/types/order';
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

type DeliveryAvailabilityConfig = {
  opening_time?: string | null;
  ordering_paused_until_date?: string | null;
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
const ORDERING_TIME_ZONE = 'Europe/Warsaw';

function calculateIncludedTaxFromGross(grossAmount: number, rate: number): number {
  if (grossAmount <= 0) return 0;
  return roundCurrency(grossAmount - grossAmount / (1 + rate));
}

function normalizeTime(value: string | null | undefined, fallback = '11:00'): string {
  if (typeof value !== 'string') return fallback;
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? fallback;
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function formatTimeInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(date);
}

function isOrderingPaused(
  config: DeliveryAvailabilityConfig | null,
  now = new Date()
): { paused: boolean; orderingPausedUntilDate: string | null; openingTime: string } {
  const orderingPausedUntilDate =
    typeof config?.ordering_paused_until_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(config.ordering_paused_until_date)
      ? config.ordering_paused_until_date
      : null;
  const openingTime = normalizeTime(config?.opening_time);

  if (!orderingPausedUntilDate) {
    return { paused: false, orderingPausedUntilDate: null, openingTime };
  }

  const currentDate = formatDateInTimeZone(now, ORDERING_TIME_ZONE);
  const currentTime = formatTimeInTimeZone(now, ORDERING_TIME_ZONE);
  const paused =
    currentDate < orderingPausedUntilDate ||
    (currentDate === orderingPausedUntilDate && currentTime < openingTime);

  return { paused, orderingPausedUntilDate, openingTime };
}

function isScheduledTimeAllowed(
  scheduledTime: string,
  orderingPausedUntilDate: string,
  openingTime: string
): boolean {
  const parsed = new Date(scheduledTime);
  if (Number.isNaN(parsed.getTime())) return false;

  const scheduledDate = formatDateInTimeZone(parsed, ORDERING_TIME_ZONE);
  const scheduledLocalTime = formatTimeInTimeZone(parsed, ORDERING_TIME_ZONE);

  return (
    scheduledDate > orderingPausedUntilDate ||
    (scheduledDate === orderingPausedUntilDate && scheduledLocalTime >= openingTime)
  );
}

async function findExistingByExternalOrderId(
  externalOrderId: string
): Promise<Order | null> {
  const serverOrdersRepo = createServerRepository<Order>('orders');
  const existing = await serverOrdersRepo.findMany(
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

  const serverOrdersRepo = createServerRepository<Order>('orders');

  // Use specific filters if provided
  if (status && Object.values(OrderStatus).includes(status)) {
    const orders = await serverOrdersRepo.findMany(
      (o) => o.status === status
    );
    const start = (page - 1) * perPage;
    const paged = orders.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: orders.length,
      page,
      per_page: perPage,
    });
  }

  if (dateFrom && dateTo) {
    const orders = await serverOrdersRepo.findMany(
      (o) => o.created_at >= dateFrom && o.created_at <= dateTo
    );
    const start = (page - 1) * perPage;
    const paged = orders.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: orders.length,
      page,
      per_page: perPage,
    });
  }

  if (customer) {
    const orders = await serverOrdersRepo.findMany(
      (o) => o.customer_id === customer || o.customer_name?.includes(customer) || o.customer_phone === customer
    );
    const start = (page - 1) * perPage;
    const paged = orders.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: orders.length,
      page,
      per_page: perPage,
    });
  }

  const result = await serverOrdersRepo.findAll({
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

  const input = await ensureCustomerForOrderDraft(validation.data);
  const now = new Date().toISOString();
  const serviceClient = createServiceClient();

  // Fast path for idempotency key.
  if (input.external_order_id) {
    const existing = await findExistingByExternalOrderId(input.external_order_id);
    if (existing) {
      return apiSuccess(existing);
    }
  }

  const { data: deliveryAvailabilityConfig, error: deliveryAvailabilityError } = await serviceClient
    .from('orders_delivery_config')
    .select('opening_time, ordering_paused_until_date')
    .eq('location_id', input.location_id)
    .maybeSingle();

  if (deliveryAvailabilityError) {
    return apiError(
      'DELIVERY_CONFIG_ERROR',
      'Nie udało się pobrać konfiguracji dostawy dla lokalizacji',
      500,
      [deliveryAvailabilityError]
    );
  }

  const orderingPause = isOrderingPaused(
    (deliveryAvailabilityConfig as DeliveryAvailabilityConfig | null) ?? null
  );
  if (orderingPause.paused && orderingPause.orderingPausedUntilDate) {
    if (!input.scheduled_time) {
      return apiValidationError([
        {
          field: 'scheduled_time',
          message: `Lokal czasowo nie przyjmuje zamówień ASAP. Wybierz termin od ${orderingPause.orderingPausedUntilDate} ${orderingPause.openingTime}.`,
        },
      ]);
    }

    if (
      !isScheduledTimeAllowed(
        input.scheduled_time,
        orderingPause.orderingPausedUntilDate,
        orderingPause.openingTime
      )
    ) {
      return apiValidationError([
        {
          field: 'scheduled_time',
          message: `Najblizszy dostepny termin to ${orderingPause.orderingPausedUntilDate} ${orderingPause.openingTime}.`,
        },
      ]);
    }
  }

  // Validate that all products exist and are available
  const uniqueProductIds = [...new Set(input.items.map((item) => item.product_id))];
  const productMap = new Map<string, Product>();
  const serverProductsRepo = createServerRepository<Product>('products');

  for (const productId of uniqueProductIds) {
    const product = await serverProductsRepo.findById(productId);
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
  const paymentFee = readMetadataPaymentFee(input.metadata);
  const tip = input.tip ?? 0;
  const loyaltyPointsUsed = input.loyalty_points_used ?? 0;
  const total = calculateOrderTotal({
    subtotal,
    discount,
    deliveryFee,
    paymentFee,
    tip,
  });
  const loyaltyPointsEarned = await estimateOrderLoyaltyPoints(
    serviceClient,
    input.customer_id,
    total
  );

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
    loyalty_points_earned: loyaltyPointsEarned,
    loyalty_points_used: loyaltyPointsUsed,
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

    const orderForSideEffects = {
      ...orderPayload,
      ...order,
      id: order.id,
      status: order.status,
      items,
    } as Order;

    if (initialStatus === OrderStatus.CONFIRMED) {
      try {
        await submitPosbistroOrder(orderForSideEffects, {
          confirmBaseUrl: buildPosbistroConfirmBaseUrl(request.nextUrl.origin),
        });
      } catch (error) {
        console.error('[POSBistro] submit on create failed:', error);
      }
    }

    const webhookData = buildOrderStatusChangedWebhookData(orderForSideEffects, {
      status: order.status,
      previousStatus: '',
    });

    scheduleWebhookDispatch(
      'order.status_changed',
      webhookData as unknown as Record<string, unknown>
    );

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
