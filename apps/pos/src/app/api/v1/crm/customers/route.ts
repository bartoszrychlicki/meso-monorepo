import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { crmRepository } from '@/modules/crm/repository';
import { CreateCustomerSchema } from '@/schemas/crm';
import { LoyaltyTier, CustomerSource } from '@/types/enums';

/**
 * GET /api/v1/crm/customers
 * List customers with optional filtering, search, and pagination.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'crm:read');
  if (!isApiKey(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '50', 10), 100);
  const search = searchParams.get('search');
  const tier = searchParams.get('tier') as LoyaltyTier | null;
  const phone = searchParams.get('phone');
  const email = searchParams.get('email');

  // Search by phone (exact match)
  if (phone) {
    const customer = await crmRepository.findCustomerByPhone(phone);
    return apiSuccess(customer ? [customer] : [], {
      total: customer ? 1 : 0,
      page: 1,
      per_page: 1,
    });
  }

  // Search by email (exact match)
  if (email) {
    const customer = await crmRepository.findCustomerByEmail(email);
    return apiSuccess(customer ? [customer] : [], {
      total: customer ? 1 : 0,
      page: 1,
      per_page: 1,
    });
  }

  // Search by query string (name, email, phone)
  if (search) {
    const customers = await crmRepository.searchCustomers(search);
    const start = (page - 1) * perPage;
    const paged = customers.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: customers.length,
      page,
      per_page: perPage,
    });
  }

  // Filter by loyalty tier
  if (tier && Object.values(LoyaltyTier).includes(tier)) {
    const customers = await crmRepository.getCustomersByTier(tier);
    const start = (page - 1) * perPage;
    const paged = customers.slice(start, start + perPage);
    return apiSuccess(paged, {
      total: customers.length,
      page,
      per_page: perPage,
    });
  }

  // Default: list all customers
  const result = await crmRepository.customers.findAll({
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
 * POST /api/v1/crm/customers
 * Create a new customer.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'crm:write');
  if (!isApiKey(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidlowe dane JSON w tresci zadania', 400);
  }

  const validation = CreateCustomerSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const input = validation.data;

  // Check for duplicate phone number
  const existingByPhone = await crmRepository.findCustomerByPhone(input.phone);
  if (existingByPhone) {
    return apiError(
      'DUPLICATE_PHONE',
      `Klient z numerem telefonu ${input.phone} juz istnieje`,
      409
    );
  }

  // Check for duplicate email if provided
  if (input.email) {
    const existingByEmail = await crmRepository.findCustomerByEmail(input.email);
    if (existingByEmail) {
      return apiError(
        'DUPLICATE_EMAIL',
        `Klient z adresem email ${input.email} juz istnieje`,
        409
      );
    }
  }

  const now = new Date().toISOString();

  const customer = await crmRepository.customers.create({
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email ?? null,
    phone: input.phone,
    birth_date: input.birth_date ?? null,
    registration_date: now,
    source: input.source ?? CustomerSource.POS_TERMINAL,
    marketing_consent: input.marketing_consent ?? false,
    loyalty_points: 0,
    loyalty_tier: LoyaltyTier.BRONZE,
    rfm_segment: null,
    rfm_recency_score: null,
    rfm_frequency_score: null,
    rfm_monetary_score: null,
    rfm_last_calculated: null,
    addresses: input.addresses?.map((addr) => ({
      ...addr,
      id: crypto.randomUUID(),
      customer_id: '', // will be set after creation
      apartment_number: addr.apartment_number ?? null,
      delivery_instructions: addr.delivery_instructions ?? null,
      created_at: now,
    })) ?? [],
    preferences: input.preferences ?? {},
    order_history: {
      total_orders: 0,
      total_spent: 0,
      average_order_value: 0,
      last_order_date: null,
      first_order_date: null,
    },
    notes: input.notes ?? null,
    is_active: true,
  });

  return apiCreated(customer);
}
