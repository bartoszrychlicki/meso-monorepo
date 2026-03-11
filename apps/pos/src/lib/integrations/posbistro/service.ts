import type { CreateOrderInput } from '@/schemas/order';
import type { BaseRepository } from '@/lib/data/base-repository';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { OrderChannel, OrderStatus, CustomerSource } from '@/types/enums';
import type { Customer } from '@/types/crm';
import type { Order } from '@/types/order';
import { createPosbistroClient, PosbistroSubmitError } from './client';
import {
  PosbistroMenuMappingError,
  resolvePosbistroMappingsForOrder,
} from './menu-mapping';
import { mapOrderToPosbistroPayload } from './mapper';
import type {
  PosbistroConfirmationPayload,
  PosbistroMenuMapping,
  PosbistroOrderIntegration,
  PosbistroSubmitResponse,
} from './types';

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000];

type CustomerRepo = Pick<BaseRepository<Customer>, 'findMany' | 'create' | 'update'>;
type OrderRepo = Pick<BaseRepository<Order>, 'findById' | 'update'>;
type IntegrationRepo = Pick<
  BaseRepository<PosbistroOrderIntegration>,
  'findMany' | 'findAll' | 'create' | 'update'
>;
type MenuMappingRepo = Pick<BaseRepository<PosbistroMenuMapping>, 'findAll'>;

function createCustomerRepo(): CustomerRepo {
  return createServerRepository<Customer>('customers');
}

function createOrderRepo(): OrderRepo {
  return createServerRepository<Order>('orders');
}

function createIntegrationRepo(): IntegrationRepo {
  return createServerRepository<PosbistroOrderIntegration>('posbistro_orders');
}

function createMenuMappingRepo(): MenuMappingRepo {
  return createServerRepository<PosbistroMenuMapping>('posbistro_menu_mappings');
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function splitCustomerName(name?: string | null): { firstName: string; lastName: string } {
  const trimmed = name?.trim() || '';
  if (!trimmed) {
    return { firstName: 'Klient', lastName: 'MESO' };
  }

  const parts = trimmed.split(/\s+/);
  const [firstName, ...rest] = parts;

  return {
    firstName: firstName || 'Klient',
    lastName: rest.join(' ') || 'MESO',
  };
}

function buildCustomerAddress(orderLike: {
  delivery_address?: Order['delivery_address'];
  notes?: string;
}, nowIso: string) {
  const address = orderLike.delivery_address;
  if (!address?.street || !address.city) return [];

  return [
    {
      id: crypto.randomUUID(),
      customer_id: '',
      label: 'Delivery',
      street: address.street,
      building_number: address.houseNumber || '',
      apartment_number: null,
      postal_code: address.postal_code || '',
      city: address.city,
      is_default: true,
      delivery_instructions: orderLike.notes || null,
      created_at: nowIso,
    },
  ];
}

async function findExistingCustomer(
  customerRepo: CustomerRepo,
  phone?: string,
  email?: string
): Promise<Customer | null> {
  const normalizedPhone = phone?.trim();
  if (normalizedPhone) {
    const byPhone = await customerRepo.findMany({
      phone: normalizedPhone,
      is_active: true,
    } as Partial<Customer>);
    if (byPhone[0]) return byPhone[0];
  }

  const normalizedEmail = email?.trim();
  if (normalizedEmail) {
    const byEmail = await customerRepo.findMany({
      email: normalizedEmail,
      is_active: true,
    } as Partial<Customer>);
    if (byEmail[0]) return byEmail[0];
  }

  return null;
}

async function patchExistingCustomer(
  customerRepo: CustomerRepo,
  customer: Customer,
  candidate: {
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
    addresses: Customer['addresses'];
  }
): Promise<Customer> {
  const patch: Partial<Customer> = {};

  if (isBlank(customer.first_name) && !isBlank(candidate.first_name)) {
    patch.first_name = candidate.first_name;
  }
  if (isBlank(customer.last_name) && !isBlank(candidate.last_name)) {
    patch.last_name = candidate.last_name;
  }
  if (isBlank(customer.phone) && !isBlank(candidate.phone)) {
    patch.phone = candidate.phone;
  }
  if (isBlank(customer.email) && !isBlank(candidate.email)) {
    patch.email = candidate.email!;
  }
  if ((customer.addresses?.length ?? 0) === 0 && candidate.addresses.length > 0) {
    patch.addresses = candidate.addresses;
  }

  if (Object.keys(patch).length === 0) {
    return customer;
  }

  const updated = await customerRepo.update(customer.id, patch);
  return (updated ?? {
    ...customer,
    ...patch,
  }) as Customer;
}

function buildCustomerCandidate(
  orderLike: {
    customer_name?: string;
    customer_phone?: string;
    delivery_address?: Order['delivery_address'];
    notes?: string;
  },
  nowIso: string
) {
  const email = orderLike.delivery_address?.email?.trim() || undefined;
  const phone = orderLike.customer_phone?.trim() || orderLike.delivery_address?.phone?.trim() || undefined;
  const nameFromAddress = [orderLike.delivery_address?.firstName, orderLike.delivery_address?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const { firstName, lastName } = splitCustomerName(orderLike.customer_name || nameFromAddress);

  return {
    first_name: firstName,
    last_name: lastName,
    phone,
    email,
    addresses: buildCustomerAddress(orderLike, nowIso),
  };
}

function shouldHandleCustomer(orderLike: { customer_id?: string; channel?: string }): boolean {
  return !orderLike.customer_id && orderLike.channel === OrderChannel.DELIVERY_APP;
}

export async function ensureCustomerForOrderDraft(
  input: CreateOrderInput,
  deps?: {
    customerRepo?: CustomerRepo;
    now?: () => Date;
  }
): Promise<CreateOrderInput> {
  if (!shouldHandleCustomer(input)) return input;

  const nowIso = (deps?.now ?? (() => new Date()))().toISOString();
  const customerRepo = deps?.customerRepo ?? createCustomerRepo();
  const candidate = buildCustomerCandidate(input, nowIso);
  const existing = await findExistingCustomer(customerRepo, candidate.phone, candidate.email);

  if (existing) {
    const updatedCustomer = await patchExistingCustomer(customerRepo, existing, candidate);
    return {
      ...input,
      customer_id: updatedCustomer.id,
    };
  }

  if (!candidate.phone) {
    return input;
  }

  const created = await customerRepo.create({
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email ?? null,
    phone: candidate.phone,
    birth_date: null,
    registration_date: nowIso,
    source: CustomerSource.WEBSITE,
    marketing_consent: false,
    loyalty_points: 0,
    loyalty_tier: 'bronze',
    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,
    addresses: candidate.addresses,
    preferences: {},
    order_history: {
      total_orders: 0,
      total_spent: 0,
      average_order_value: 0,
      last_order_date: null,
      first_order_date: null,
    },
    notes: null,
    is_active: true,
  } as Omit<Customer, 'id' | 'created_at' | 'updated_at'>);

  return {
    ...input,
    customer_id: created.id,
  };
}

export async function ensureCustomerForOrder(
  order: Order,
  deps?: {
    customerRepo?: CustomerRepo;
    orderRepo?: OrderRepo;
    now?: () => Date;
  }
): Promise<Order> {
  if (!shouldHandleCustomer(order)) return order;

  const nowIso = (deps?.now ?? (() => new Date()))().toISOString();
  const customerRepo = deps?.customerRepo ?? createCustomerRepo();
  const orderRepo = deps?.orderRepo ?? createOrderRepo();
  const candidate = buildCustomerCandidate(order, nowIso);
  const existing = await findExistingCustomer(customerRepo, candidate.phone, candidate.email);

  let customerId: string | undefined;

  if (existing) {
    const updatedCustomer = await patchExistingCustomer(customerRepo, existing, candidate);
    customerId = updatedCustomer.id;
  } else if (candidate.phone) {
    const created = await customerRepo.create({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email ?? null,
      phone: candidate.phone,
      birth_date: null,
      registration_date: nowIso,
      source: CustomerSource.WEBSITE,
      marketing_consent: false,
      loyalty_points: 0,
      loyalty_tier: 'bronze',
      rfm_segment: null,
      rfm_recency_score: null,
      rfm_frequency_score: null,
      rfm_monetary_score: null,
      rfm_last_calculated: null,
      addresses: candidate.addresses,
      preferences: {},
      order_history: {
        total_orders: 0,
        total_spent: 0,
        average_order_value: 0,
        last_order_date: null,
        first_order_date: null,
      },
      notes: null,
      is_active: true,
    } as Omit<Customer, 'id' | 'created_at' | 'updated_at'>);
    customerId = created.id;
  }

  if (!customerId) return order;

  return orderRepo.update(order.id, {
    customer_id: customerId,
  } as Partial<Order>);
}

function isPosbistroEligibleOrder(order: Pick<Order, 'channel' | 'status'>): boolean {
  return order.channel === OrderChannel.DELIVERY_APP && order.status === OrderStatus.CONFIRMED;
}

function extractPosbistroOrderId(response: PosbistroSubmitResponse): string | null {
  const nestedData =
    response.data && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>)
      : null;
  const directValue = response.orderId ?? response.id ?? nestedData?.orderId ?? nestedData?.id;
  return typeof directValue === 'string' && directValue.length > 0 ? directValue : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown POSBistro submit error';
}

function getErrorPayload(error: unknown): Record<string, unknown> | null {
  if (error instanceof PosbistroMenuMappingError) {
    return toRecord({
      message: error.message,
      details: error.details,
      code: 'missing_posbistro_mapping',
    });
  }

  if (error instanceof PosbistroSubmitError) {
    return toRecord(error.responseBody) ?? {
      message: error.message,
    };
  }

  return toRecord(error instanceof Error ? { message: error.message } : error);
}

async function findIntegrationByOrderId(
  integrationRepo: IntegrationRepo,
  orderId: string
): Promise<PosbistroOrderIntegration | null> {
  const records = await integrationRepo.findMany({
    order_id: orderId,
  } as Partial<PosbistroOrderIntegration>);
  return records[0] ?? null;
}

async function findIntegrationByToken(
  integrationRepo: IntegrationRepo,
  token: string
): Promise<PosbistroOrderIntegration | null> {
  const records = await integrationRepo.findMany({
    callback_token: token,
  } as Partial<PosbistroOrderIntegration>);
  return records[0] ?? null;
}

export function getNextRetryAt(baseDate: Date, attempts: number): Date {
  const index = Math.min(Math.max(attempts, 1), RETRY_DELAYS_MS.length) - 1;
  return new Date(baseDate.getTime() + RETRY_DELAYS_MS[index]);
}

export function buildPosbistroConfirmBaseUrl(origin?: string): string {
  const normalizedOrigin = origin?.trim().replace(/\/$/, '');
  if (normalizedOrigin) {
    if (normalizedOrigin.includes('/api/integrations/posbistro/confirm')) {
      return normalizedOrigin;
    }
    return `${normalizedOrigin}/api/integrations/posbistro/confirm`;
  }

  const explicitUrl = process.env.POSBISTRO_CONFIRM_BASE_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  const vercelHost =
    process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost.replace(/\/$/, '')}/api/integrations/posbistro/confirm`;
  }

  return 'http://localhost:3000/api/integrations/posbistro/confirm';
}

function normalizeConfirmationStatus(
  status: PosbistroConfirmationPayload['status']
): 'accepted' | 'rejected' {
  return String(status).toLowerCase() === 'accepted' ? 'accepted' : 'rejected';
}

function extractConfirmationOrderId(
  integration: PosbistroOrderIntegration,
  payload: PosbistroConfirmationPayload
): string | null {
  if (!payload.orderId || payload.orderId === integration.order_id) {
    return integration.posbistro_order_id;
  }

  return payload.orderId;
}

export async function submitPosbistroOrder(
  order: Order,
  deps?: {
    integrationRepo?: IntegrationRepo;
    mappingRepo?: MenuMappingRepo;
    client?: Pick<ReturnType<typeof createPosbistroClient>, 'submitOrder'>;
    confirmBaseUrl?: string;
    now?: () => Date;
    randomUUID?: () => string;
  }
): Promise<PosbistroOrderIntegration | null> {
  if (!isPosbistroEligibleOrder(order)) return null;

  const integrationRepo = deps?.integrationRepo ?? createIntegrationRepo();
  const mappingRepo = deps?.mappingRepo ?? createMenuMappingRepo();
  const client = deps?.client ?? createPosbistroClient();
  const now = deps?.now ?? (() => new Date());
  const randomUUID = deps?.randomUUID ?? (() => crypto.randomUUID());
  const confirmBaseUrl = buildPosbistroConfirmBaseUrl(deps?.confirmBaseUrl);

  let integration = await findIntegrationByOrderId(integrationRepo, order.id);
  if (integration && (integration.status === 'submitted' || integration.status === 'accepted')) {
    return integration;
  }

  if (!integration) {
    integration = await integrationRepo.create({
      order_id: order.id,
      status: 'pending',
      callback_token: randomUUID(),
      posbistro_order_id: null,
      request_payload: null,
      response_payload: null,
      attempts: 0,
      last_error: null,
      next_retry_at: null,
      confirmed_at: null,
      rejected_at: null,
      rejection_reason: null,
    } as Omit<PosbistroOrderIntegration, 'id' | 'created_at' | 'updated_at'>);
  }

  const attemptNumber = integration.attempts + 1;

  try {
    const resolvedMappings = await resolvePosbistroMappingsForOrder(order, {
      mappingRepo,
    });
    const payload = mapOrderToPosbistroPayload(order, {
      callbackToken: integration.callback_token,
      confirmBaseUrl,
      resolvedMappings,
    });

    await integrationRepo.update(integration.id, {
      status: 'sending',
      attempts: attemptNumber,
      request_payload: payload as unknown as Record<string, unknown>,
      last_error: null,
      next_retry_at: null,
    });

    const response = await client.submitOrder(payload);
    return integrationRepo.update(integration.id, {
      status: 'submitted',
      response_payload: toRecord(response),
      posbistro_order_id: extractPosbistroOrderId(response),
      last_error: null,
      next_retry_at: null,
    });
  } catch (error) {
    const currentTime = now();
    const nextRetryAt = error instanceof PosbistroMenuMappingError
      ? null
      : attemptNumber >= MAX_ATTEMPTS
        ? null
        : getNextRetryAt(currentTime, attemptNumber).toISOString();

    return integrationRepo.update(integration.id, {
      status: 'failed',
      attempts: attemptNumber,
      last_error: getErrorMessage(error),
      response_payload: getErrorPayload(error),
      next_retry_at: nextRetryAt,
    });
  }
}

export async function handlePosbistroConfirmation(
  payload: PosbistroConfirmationPayload,
  deps: {
    token: string;
    integrationRepo?: IntegrationRepo;
    orderRepo?: OrderRepo;
    now?: () => Date;
  }
): Promise<{ integration: PosbistroOrderIntegration; order: Order | null }> {
  const integrationRepo = deps.integrationRepo ?? createIntegrationRepo();
  const orderRepo = deps.orderRepo ?? createOrderRepo();
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  const integration = await findIntegrationByToken(integrationRepo, deps.token);

  if (!integration) {
    throw new Error('POSBISTRO_CONFIRMATION_NOT_FOUND');
  }

  const order = await orderRepo.findById(integration.order_id);
  const normalizedStatus = normalizeConfirmationStatus(payload.status);

  if (normalizedStatus === 'accepted') {
    if (integration.status === 'accepted') {
      return { integration, order };
    }

    const updated = await integrationRepo.update(integration.id, {
      status: 'accepted',
      confirmed_at: nowIso,
      posbistro_order_id: extractConfirmationOrderId(integration, payload),
      response_payload: payload as unknown as Record<string, unknown>,
      rejection_reason: null,
    });

    return { integration: updated, order };
  }

  if (integration.status === 'rejected') {
    return { integration, order };
  }

  const reason =
    payload.reason || payload.comment || payload.message || 'Order rejected by POSBistro';
  const updatedIntegration = await integrationRepo.update(integration.id, {
    status: 'rejected',
    rejected_at: nowIso,
    rejection_reason: reason,
    response_payload: payload as unknown as Record<string, unknown>,
    posbistro_order_id: extractConfirmationOrderId(integration, payload),
  });

  if (!order || order.status === OrderStatus.CANCELLED) {
    return { integration: updatedIntegration, order };
  }

  const updatedOrder = await orderRepo.update(order.id, {
    status: OrderStatus.CANCELLED,
    cancelled_at: nowIso,
    status_history: [
      ...(Array.isArray(order.status_history) ? order.status_history : []),
      {
        status: OrderStatus.CANCELLED,
        timestamp: nowIso,
        note: `POSBistro: ${reason}`,
      },
    ],
  } as Partial<Order>);

  return { integration: updatedIntegration, order: updatedOrder };
}

export async function retryPendingPosbistroExports(deps?: {
  integrationRepo?: IntegrationRepo;
  orderRepo?: OrderRepo;
  mappingRepo?: MenuMappingRepo;
  client?: Pick<ReturnType<typeof createPosbistroClient>, 'submitOrder'>;
  confirmBaseUrl?: string;
  now?: () => Date;
}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const integrationRepo = deps?.integrationRepo ?? createIntegrationRepo();
  const orderRepo = deps?.orderRepo ?? createOrderRepo();
  const client = deps?.client ?? createPosbistroClient();
  const now = deps?.now ?? (() => new Date());
  const currentTime = now();

  const page = await integrationRepo.findAll({
    page: 1,
    per_page: 100,
    sort_by: 'created_at',
    sort_order: 'asc',
  });

  const dueRecords = page.data.filter((record) => {
    if (record.status === 'pending') {
      if (!record.next_retry_at) return true;
      return new Date(record.next_retry_at) <= currentTime;
    }

    if (record.status === 'failed') {
      if (!record.next_retry_at) return false;
      return new Date(record.next_retry_at) <= currentTime;
    }

    return false;
  });

  let succeeded = 0;
  let failed = 0;

  for (const record of dueRecords) {
    const order = await orderRepo.findById(record.order_id);
    if (!order) {
      failed += 1;
      await integrationRepo.update(record.id, {
        status: 'failed',
        last_error: 'Linked order not found',
      });
      continue;
    }

    const result = await submitPosbistroOrder(order, {
      integrationRepo,
      mappingRepo: deps?.mappingRepo,
      client,
      confirmBaseUrl: deps?.confirmBaseUrl,
      now,
    });

    if (result && (result.status === 'submitted' || result.status === 'accepted')) {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  return {
    processed: dueRecords.length,
    succeeded,
    failed,
  };
}
