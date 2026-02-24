import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { ordersRepository } from '@/modules/orders/repository';
import { CreateOrderSchema } from '@/schemas/order';
import { OrderChannel, OrderStatus, PaymentStatus } from '@/types/enums';

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

  // Idempotency check: if external_order_id provided, check for duplicate
  if (input.external_order_id) {
    const existing = await ordersRepository.findMany(
      (o) => o.external_order_id === input.external_order_id
    );
    if (existing.length > 0) {
      return apiSuccess(existing[0]);
    }
  }

  const orderNumber = await ordersRepository.generateOrderNumber();

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
  const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% VAT
  const discount = input.discount ?? 0;
  const total = Math.round((subtotal + tax - discount) * 100) / 100;

  // Delivery app orders with pre-paid status start as CONFIRMED
  const isDeliveryPrePaid =
    input.channel === OrderChannel.DELIVERY_APP &&
    input.payment_status === PaymentStatus.PAID;

  const initialStatus = isDeliveryPrePaid
    ? OrderStatus.CONFIRMED
    : OrderStatus.PENDING;
  const initialPaymentStatus = isDeliveryPrePaid
    ? PaymentStatus.PAID
    : PaymentStatus.PENDING;
  const statusNote = isDeliveryPrePaid
    ? 'Zamówienie z delivery app (opłacone)'
    : 'Zamówienie utworzone przez API';

  const order = await ordersRepository.create({
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
  });

  return apiCreated(order);
}
