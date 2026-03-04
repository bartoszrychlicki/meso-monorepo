import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { createServiceClient } from '@/lib/supabase/server';
import { CreateOrderSchema } from '@/schemas/order';
import type { Order } from '@/types/order';

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
  const serverOrdersRepo = createServerRepository<Order>('orders');
  const order = await serverOrdersRepo.findById(id);
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
  const serverOrdersRepo = createServerRepository<Order>('orders');
  const existing = await serverOrdersRepo.findById(id);
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

  // If items are being updated, sync JSON + relational rows transactionally via RPC.
  if (updateData.items) {
    const items = updateData.items.map((item) => {
      const modifiersTotal = item.modifiers.reduce(
        (sum, m) => sum + m.price * m.quantity,
        0
      );
      const subtotal = item.quantity * (item.unit_price + modifiersTotal);
      return { ...item, id: crypto.randomUUID(), subtotal };
    });

    const persistedItems = items.map((item) => ({
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

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.rpc('replace_order_items', {
      p_order_id: id,
      p_items: items,
      p_order_items: persistedItems,
      p_discount: updateData.discount ?? null,
      p_delivery_fee: updateData.delivery_fee ?? null,
      p_tip: updateData.tip ?? null,
    });

    if (error) {
      return apiError(
        'ORDER_UPDATE_FAILED',
        'Nie udało się zaktualizować pozycji zamówienia',
        500,
        [error]
      );
    }

    const updated = (Array.isArray(data) ? data[0] : data) as Order | null;
    if (!updated) {
      return apiError(
        'ORDER_UPDATE_FAILED',
        'Nie udało się zaktualizować pozycji zamówienia',
        500
      );
    }

    const {
      items: _items,
      discount: _discount,
      delivery_fee: _deliveryFee,
      tip: _tip,
      ...additionalFields
    } = updateData;

    if (Object.keys(additionalFields).length > 0) {
      const patched = await serverOrdersRepo.update(
        id,
        additionalFields as Partial<Order>
      );
      return apiSuccess(patched);
    }

    return apiSuccess(updated);
  }

  const updated = await serverOrdersRepo.update(id, updateData as Partial<Order>);
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
  const serverOrdersRepo = createServerRepository<Order>('orders');
  const existing = await serverOrdersRepo.findById(id);
  if (!existing) return apiNotFound('Zamówienie');

  await serverOrdersRepo.delete(id);
  return apiSuccess({ deleted: true });
}
