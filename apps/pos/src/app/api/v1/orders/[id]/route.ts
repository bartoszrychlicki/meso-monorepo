import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  type ApiResponseWarning,
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import {
  buildKitchenItemsFromOrderItems,
  buildKitchenTicketStatusPatch,
  calculateOrderItemSubtotal,
  estimateKitchenTicketMinutes,
  haveOrderItemsChanged,
  isOrderEditableStatus,
} from '@/lib/orders/order-editing';
import {
  calculateOrderTotal,
  mergeOrderMetadata,
  readMetadataPaymentFee,
} from '@/lib/orders/financials';
import {
  buildRollbackLifecycleTimestampPatch,
  buildRollbackStatusNote,
} from '@/lib/orders/status-rollback';
import { createServiceClient } from '@/lib/supabase/server';
import { UpdateOrderSchema, type UpdateOrderInput } from '@/schemas/order';
import { isValidPhoneNumber } from '@/lib/sms/templates';
import { authorizeOrderRoute } from '@/modules/orders/server/route-auth';
import type { Customer } from '@/types/crm';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';
import type { Order, OrderItem } from '@/types/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type PersistedOrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  spice_level: null;
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

type MutationActor =
  | { authType: 'api_key'; actorId: string | null }
  | { authType: 'session'; actorId: string };

const ACTIVE_KITCHEN_TICKET_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
] as const;

function hasOwnProperty<T extends object>(
  value: T,
  key: keyof T
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildOrderItems(items: NonNullable<UpdateOrderInput['items']>): OrderItem[] {
  return items.map((item) => ({
    id: item.id?.trim() || crypto.randomUUID(),
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    variant_name: item.variant_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    original_unit_price: item.original_unit_price,
    promotion_label: item.promotion_label,
    modifiers: item.modifiers ?? [],
    subtotal: calculateOrderItemSubtotal(item),
    notes: item.notes,
  }));
}

function buildPersistedOrderItems(items: OrderItem[]): PersistedOrderItem[] {
  return items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.subtotal,
    spice_level: null,
    variant_name: item.variant_name,
    addons: (item.modifiers ?? []).map((modifier) => ({
      id: modifier.modifier_id,
      name: modifier.name,
      price: modifier.price,
      quantity: modifier.quantity,
      modifier_action: modifier.modifier_action,
    })),
    notes: item.notes,
  }));
}

function buildEditRollbackNote(itemsChanged: boolean, notesChanged: boolean): string {
  const changedAreas: string[] = [];
  if (itemsChanged) changedAreas.push('składu');
  if (notesChanged) changedAreas.push('uwag');

  const reasonLabel =
    changedAreas.length > 0
      ? `Edycja ${changedAreas.join(' i ')} zamówienia. `
      : '';

  return `${reasonLabel}${buildRollbackStatusNote(OrderStatus.READY, OrderStatus.PREPARING)}`;
}

async function authorizeOrderWrite(
  request: NextRequest
): Promise<MutationActor | Response> {
  const access = await authorizeOrderRoute(request, 'orders:write');
  if ('status' in access) {
    return access;
  }

  if (access.kind === 'api_key') {
    return {
      authType: 'api_key',
      actorId: access.actorId,
    };
  }

  return {
    authType: 'session',
    actorId: access.actorId,
  };
}

async function syncKitchenTicket(
  order: Order,
  shouldSyncContents: boolean,
  options: { resetCompletionState?: boolean } = {}
): Promise<void> {
  if (!shouldSyncContents) {
    return;
  }

  const ticketStatusPatch = buildKitchenTicketStatusPatch(order.status);
  if (!ticketStatusPatch) {
    return;
  }

  const serviceClient = createServiceClient();
  const { data: tickets, error } = await serviceClient
    .from('orders_kitchen_tickets')
    .select('*')
    .eq('order_id', order.id)
    .in('status', [...ACTIVE_KITCHEN_TICKET_STATUSES]);

  if (error) {
    throw new Error(`[orders_kitchen_tickets] load failed: ${error.message}`);
  }

  for (const rawTicket of (tickets ?? []) as KitchenTicket[]) {
    const nextItems = buildKitchenItemsFromOrderItems(
      order.items,
      Array.isArray(rawTicket.items) ? rawTicket.items : [],
      {
        resetCompletionState: options.resetCompletionState,
      }
    );

    const { error: updateError } = await serviceClient
      .from('orders_kitchen_tickets')
      .update({
        ...ticketStatusPatch,
        items: nextItems,
        notes: order.notes || null,
        estimated_minutes: estimateKitchenTicketMinutes(order.items),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawTicket.id);

    if (updateError) {
      throw new Error(`[orders_kitchen_tickets] update failed: ${updateError.message}`);
    }
  }
}

async function syncCustomerPhone(existingOrder: Order, requestedPhone: string | undefined): Promise<void> {
  const normalizedPhone = requestedPhone?.trim();
  if (!existingOrder.customer_id || !normalizedPhone || normalizedPhone === existingOrder.customer_phone) {
    return;
  }

  const customersRepo = createServerRepository<Customer>('customers');
  const customer = await customersRepo.findById(existingOrder.customer_id);
  if (!customer) {
    return;
  }

  await customersRepo.update(existingOrder.customer_id, {
    phone: normalizedPhone,
  } as Partial<Customer>);
}

async function runOrderUpdateSideEffects(params: {
  existingOrder: Order;
  updatedOrder: Order;
  requestedPhone: string | undefined;
  shouldSyncKitchenContents: boolean;
  resetKitchenCompletionState: boolean;
}): Promise<ApiResponseWarning[]> {
  const warnings: ApiResponseWarning[] = [];

  try {
    await syncKitchenTicket(
      params.updatedOrder,
      params.shouldSyncKitchenContents,
      {
        resetCompletionState: params.resetKitchenCompletionState,
      }
    );
  } catch (error) {
    console.error('[orders.update] Kitchen ticket sync failed', {
      orderId: params.updatedOrder.id,
      error,
    });
    warnings.push({
      code: 'KITCHEN_SYNC_FAILED',
      message: 'Zamówienie zostało zapisane, ale nie udało się zsynchronizować ticketu kuchni.',
    });
  }

  try {
    await syncCustomerPhone(params.existingOrder, params.requestedPhone);
  } catch (error) {
    console.error('[orders.update] Customer phone sync failed', {
      orderId: params.updatedOrder.id,
      customerId: params.existingOrder.customer_id,
      error,
    });
    warnings.push({
      code: 'CUSTOMER_SYNC_FAILED',
      message: 'Zamówienie zostało zapisane, ale nie udało się zaktualizować telefonu klienta w CRM.',
    });
  }

  return warnings;
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
 * Update editable order details from POS.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeOrderWrite(request);
  if ('status' in auth) return auth;

  const { id } = await params;
  const serverOrdersRepo = createServerRepository<Order>('orders');
  const existing = await serverOrdersRepo.findById(id);
  if (!existing) return apiNotFound('Zamówienie');

  if (!isOrderEditableStatus(existing.status)) {
    return apiError(
      'ORDER_EDIT_NOT_ALLOWED',
      'To zamówienie nie może już być edytowane',
      422
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = UpdateOrderSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  const input = validation.data;
  const nextItems = input.items ? buildOrderItems(input.items) : existing.items;
  const mergedMetadata = hasOwnProperty(input, 'metadata')
    ? mergeOrderMetadata(existing.metadata, input.metadata)
    : existing.metadata;
  const nextSubtotal = input.items
    ? nextItems.reduce((sum, item) => sum + item.subtotal, 0)
    : existing.subtotal;
  const nextDiscount = hasOwnProperty(input, 'discount')
    ? (input.discount ?? 0)
    : existing.discount;
  const nextDeliveryFee = hasOwnProperty(input, 'delivery_fee')
    ? input.delivery_fee
    : existing.delivery_fee;
  const nextTip = hasOwnProperty(input, 'tip')
    ? input.tip
    : existing.tip;
  const nextTotal = input.items || hasOwnProperty(input, 'discount') || hasOwnProperty(input, 'delivery_fee') || hasOwnProperty(input, 'tip') || hasOwnProperty(input, 'metadata')
    ? calculateOrderTotal({
        subtotal: nextSubtotal,
        discount: nextDiscount,
        deliveryFee: nextDeliveryFee,
        paymentFee: readMetadataPaymentFee(mergedMetadata),
        tip: nextTip,
      })
    : existing.total;

  const normalizedPhone = hasOwnProperty(input, 'customer_phone')
    ? input.customer_phone?.trim()
    : undefined;
  if (hasOwnProperty(input, 'customer_phone')) {
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      return apiValidationError([
        {
          field: 'customer_phone',
          message: 'Niepoprawny numer telefonu',
        },
      ]);
    }
  }

  if (
    existing.payment_method === PaymentMethod.ONLINE &&
    existing.payment_status === PaymentStatus.PAID &&
    nextTotal !== existing.total
  ) {
    return apiError(
      'ONLINE_PAYMENT_AMOUNT_LOCKED',
      'Nie można zmienić kwoty opłaconego zamówienia online',
      422
    );
  }

  const itemsChanged = input.items
    ? haveOrderItemsChanged(existing.items, nextItems)
    : false;
  const nextNotes = hasOwnProperty(input, 'notes') ? input.notes : existing.notes;
  const notesChanged = hasOwnProperty(input, 'notes')
    ? (existing.notes ?? '') !== (input.notes ?? '')
    : false;
  const shouldRollbackReady = existing.status === OrderStatus.READY && (itemsChanged || notesChanged);
  const shouldSyncKitchenContents = itemsChanged || notesChanged;
  const shouldResetKitchenCompletionState = shouldRollbackReady && notesChanged;
  const nowIso = new Date().toISOString();
  const nextStatus = shouldRollbackReady ? OrderStatus.PREPARING : existing.status;

  let updatedOrder: Order = existing;

  if (input.items) {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.rpc('replace_order_items', {
      p_order_id: id,
      p_items: nextItems,
      p_order_items: buildPersistedOrderItems(nextItems),
      p_discount: nextDiscount ?? null,
      p_delivery_fee: nextDeliveryFee ?? null,
      p_tip: nextTip ?? null,
    });

    if (error) {
      return apiError(
        'ORDER_UPDATE_FAILED',
        'Nie udało się zaktualizować pozycji zamówienia',
        500,
        [error]
      );
    }

    const rpcUpdated = (Array.isArray(data) ? data[0] : data) as Order | null;
    if (!rpcUpdated) {
      return apiError(
        'ORDER_UPDATE_FAILED',
        'Nie udało się zaktualizować pozycji zamówienia',
        500
      );
    }

    updatedOrder = rpcUpdated;
  }

  const patch: Partial<Order> = {};

  if (hasOwnProperty(input, 'customer_name')) {
    patch.customer_name = input.customer_name;
  }

  if (hasOwnProperty(input, 'customer_phone')) {
    patch.customer_phone = normalizedPhone;
  }

  if (hasOwnProperty(input, 'notes')) {
    patch.notes = nextNotes;
  }

  if (!input.items && hasOwnProperty(input, 'discount')) {
    patch.discount = nextDiscount;
  }

  if (!input.items && hasOwnProperty(input, 'delivery_fee')) {
    patch.delivery_fee = nextDeliveryFee;
  }

  if (!input.items && hasOwnProperty(input, 'tip')) {
    patch.tip = nextTip;
  }

  if (hasOwnProperty(input, 'metadata')) {
    patch.metadata = mergedMetadata;
  }

  if (!input.items && (
    hasOwnProperty(input, 'discount') ||
    hasOwnProperty(input, 'delivery_fee') ||
    hasOwnProperty(input, 'tip') ||
    hasOwnProperty(input, 'metadata')
  )) {
    patch.total = nextTotal;
  }

  if (hasOwnProperty(input, 'metadata') && input.items) {
    if (nextTotal !== updatedOrder.total) {
      patch.total = nextTotal;
    }
  }

  if (shouldRollbackReady) {
    patch.status = nextStatus;
    patch.status_history = [
      ...(Array.isArray(updatedOrder.status_history) ? updatedOrder.status_history : []),
      {
        status: nextStatus,
        timestamp: nowIso,
        changed_by: auth.actorId ?? undefined,
        note: buildEditRollbackNote(itemsChanged, notesChanged),
      },
    ];
    Object.assign(patch, buildRollbackLifecycleTimestampPatch(nextStatus));
  }

  if (Object.keys(patch).length > 0) {
    updatedOrder = await serverOrdersRepo.update(id, patch);
  }

  const warnings = await runOrderUpdateSideEffects({
    existingOrder: existing,
    updatedOrder,
    requestedPhone: normalizedPhone,
    shouldSyncKitchenContents,
    resetKitchenCompletionState: shouldResetKitchenCompletionState,
  });

  return apiSuccess(
    updatedOrder,
    warnings.length > 0 ? { warnings } : undefined
  );
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
