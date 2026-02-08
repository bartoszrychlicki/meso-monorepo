import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { ordersRepository } from '@/modules/orders/repository';
import { CreateOrderSchema } from '@/schemas/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/orders/:id
 * Get a single order by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'orders:read');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const order = await ordersRepository.findById(id);
  if (!order) return apiNotFound('Zamówienie');

  return apiSuccess(order);
}

/**
 * PUT /api/v1/orders/:id
 * Update an order (e.g., items, customer info, notes).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'orders:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const existing = await ordersRepository.findById(id);
  if (!existing) return apiNotFound('Zamówienie');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  // Use partial validation for updates
  const UpdateOrderSchema = CreateOrderSchema.partial();
  const validation = UpdateOrderSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const updateData = validation.data;

  // If items are being updated, recalculate totals
  if (updateData.items) {
    const items = updateData.items.map((item) => {
      const modifiersTotal = item.modifiers.reduce(
        (sum, m) => sum + m.price * m.quantity,
        0
      );
      const subtotal = item.quantity * (item.unit_price + modifiersTotal);
      return { ...item, id: crypto.randomUUID(), subtotal };
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const discount = updateData.discount ?? existing.discount;
    const total = Math.round((subtotal + tax - discount) * 100) / 100;

    const updated = await ordersRepository.update(id, {
      ...updateData,
      items,
      subtotal,
      tax,
      discount,
      total,
    } as Partial<typeof existing>);
    return apiSuccess(updated);
  }

  const updated = await ordersRepository.update(id, updateData as Partial<typeof existing>);
  return apiSuccess(updated);
}

/**
 * DELETE /api/v1/orders/:id
 * Delete an order.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'orders:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const existing = await ordersRepository.findById(id);
  if (!existing) return apiNotFound('Zamówienie');

  await ordersRepository.delete(id);
  return apiSuccess({ deleted: true });
}
