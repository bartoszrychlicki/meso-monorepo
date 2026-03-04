import { NextRequest } from 'next/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { UpdateCustomerSchema } from '@/schemas/crm';
import type { Customer } from '@/types/crm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/crm/customers/:id
 * Get a single customer by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'crm:read');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverCustomersRepo = createServerRepository<Customer>('customers');
  const customer = await serverCustomersRepo.findById(id);
  if (!customer) return apiNotFound('Klient');

  return apiSuccess(customer);
}

/**
 * PUT /api/v1/crm/customers/:id
 * Update a customer (partial update).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'crm:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverCustomersRepo = createServerRepository<Customer>('customers');
  const existing = await serverCustomersRepo.findById(id);
  if (!existing) return apiNotFound('Klient');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidlowe dane JSON w tresci zadania', 400);
  }

  const validation = UpdateCustomerSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const updateData = validation.data;

  // Check for duplicate phone if changing phone
  if (updateData.phone && updateData.phone !== existing.phone) {
    const existingByPhone = await serverCustomersRepo.findMany(
      (c) => c.phone === updateData.phone && c.is_active
    );
    if (existingByPhone.length > 0) {
      return apiError(
        'DUPLICATE_PHONE',
        `Klient z numerem telefonu ${updateData.phone} juz istnieje`,
        409
      );
    }
  }

  // Check for duplicate email if changing email
  if (updateData.email && updateData.email !== existing.email) {
    const existingByEmail = await serverCustomersRepo.findMany(
      (c) => c.email === updateData.email && c.is_active
    );
    if (existingByEmail.length > 0) {
      return apiError(
        'DUPLICATE_EMAIL',
        `Klient z adresem email ${updateData.email} juz istnieje`,
        409
      );
    }
  }

  const updated = await serverCustomersRepo.update(id, {
    ...updateData,
    updated_at: new Date().toISOString(),
  } as Partial<Customer>);

  return apiSuccess(updated);
}

/**
 * DELETE /api/v1/crm/customers/:id
 * Delete a customer (soft-delete by setting is_active to false).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, 'crm:write');
  if (!isApiKey(auth)) return auth;

  const { id } = await params;
  const serverCustomersRepo = createServerRepository<Customer>('customers');
  const existing = await serverCustomersRepo.findById(id);
  if (!existing) return apiNotFound('Klient');

  await serverCustomersRepo.update(id, {
    is_active: false,
    updated_at: new Date().toISOString(),
  } as Partial<Customer>);

  return apiSuccess({ deleted: true });
}
