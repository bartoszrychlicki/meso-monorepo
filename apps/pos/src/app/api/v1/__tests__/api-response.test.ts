import { describe, it, expect } from 'vitest';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiNotFound,
  apiUnauthorized,
  apiForbidden,
  apiValidationError,
} from '@/lib/api/response';

describe('API Response helpers', () => {
  it('apiSuccess returns 200 with data and meta', async () => {
    const res = apiSuccess({ id: '1', name: 'Test' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('1');
    expect(body.meta.timestamp).toBeDefined();
  });

  it('apiSuccess includes pagination meta', async () => {
    const res = apiSuccess([1, 2, 3], { total: 100, page: 2, per_page: 10 });
    const body = await res.json();

    expect(body.meta.total).toBe(100);
    expect(body.meta.page).toBe(2);
    expect(body.meta.per_page).toBe(10);
  });

  it('apiCreated returns 201', async () => {
    const res = apiCreated({ id: 'new-1' });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('new-1');
  });

  it('apiError returns specified status code', async () => {
    const res = apiError('CUSTOM_ERROR', 'Something went wrong', 400);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CUSTOM_ERROR');
    expect(body.error.message).toBe('Something went wrong');
  });

  it('apiNotFound returns 404', async () => {
    const res = apiNotFound('Zamowienie');
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('apiUnauthorized returns 401', async () => {
    const res = apiUnauthorized();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('apiForbidden returns 403 with permission info', async () => {
    const res = apiForbidden('orders:write');
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('orders:write');
  });

  it('apiValidationError returns 422 with field details', async () => {
    const details = [
      { field: 'name', message: 'Name is required' },
      { field: 'email', message: 'Invalid email' },
    ];
    const res = apiValidationError(details);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toHaveLength(2);
  });
});
