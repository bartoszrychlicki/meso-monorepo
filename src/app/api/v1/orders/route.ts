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
import { OrderStatus, PaymentStatus } from '@/types/enums';

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

  const order = await ordersRepository.create({
    order_number: orderNumber,
    status: OrderStatus.PENDING,
    channel: input.channel,
    source: input.source,
    location_id: input.location_id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    items,
    subtotal,
    tax,
    discount,
    total,
    payment_method: input.payment_method,
    payment_status: PaymentStatus.PENDING,
    notes: input.notes,
    status_history: [
      {
        status: OrderStatus.PENDING,
        timestamp: now,
        note: 'Zamówienie utworzone przez API',
      },
    ],
  });

  return apiCreated(order);
}
