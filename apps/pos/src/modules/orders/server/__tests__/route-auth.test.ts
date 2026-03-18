import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  authorizeRequest: vi.fn(),
  isApiKey: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { authorizeOrderRoute } from '@/modules/orders/server/route-auth';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockAuthorizeRequest = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/v1/orders/order-1');
}

function createUsersTableMock(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  return {
    query: { select },
    maybeSingle,
    eq,
  };
}

describe('authorizeOrderRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows order edits for cashier session', async () => {
    const usersTable = createUsersTableMock({ role: 'cashier', is_active: true });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'cashier@test.com',
            },
          },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users_users') {
          return usersTable.query;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await authorizeOrderRoute(makeRequest(), 'orders:write');

    expect(result).toEqual({ kind: 'session', actorId: 'user-1' });
  });

  it('forbids order edits for chef session', async () => {
    const usersTable = createUsersTableMock({ role: 'chef', is_active: true });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-2',
              email: 'chef@test.com',
            },
          },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users_users') {
          return usersTable.query;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await authorizeOrderRoute(makeRequest(), 'orders:write');

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it('allows status changes for chef session', async () => {
    const usersTable = createUsersTableMock({ role: 'chef', is_active: true });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-3',
              email: 'chef@test.com',
            },
          },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users_users') {
          return usersTable.query;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await authorizeOrderRoute(makeRequest(), 'orders:status');

    expect(result).toEqual({ kind: 'session', actorId: 'user-3' });
  });

  it('falls back to staff role matched by email', async () => {
    const usersTableById = createUsersTableMock(null);
    const usersTableByEmail = createUsersTableMock({ role: 'manager', is_active: true });
    const from = vi.fn((table: string) => {
      if (table === 'users_users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              if (field === 'id') {
                expect(value).toBe('user-4');
                return { maybeSingle: usersTableById.maybeSingle };
              }

              if (field === 'email') {
                expect(value).toBe('legacy@test.com');
                return { maybeSingle: usersTableByEmail.maybeSingle };
              }

              throw new Error(`Unexpected field ${field}`);
            }),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-4',
              email: 'legacy@test.com',
            },
          },
        }),
      },
      from,
    });

    const result = await authorizeOrderRoute(makeRequest(), 'orders:status');

    expect(result).toEqual({ kind: 'session', actorId: 'user-4' });
  });

  it('rejects inactive staff sessions', async () => {
    const usersTable = createUsersTableMock({ role: 'manager', is_active: false });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-5',
              email: 'inactive@test.com',
            },
          },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users_users') {
          return usersTable.query;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await authorizeOrderRoute(makeRequest(), 'orders:status');

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it('still allows api key access when there is no session', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
        }),
      },
      from: vi.fn(),
    });
    mockAuthorizeRequest.mockResolvedValue({
      id: 'api-key-1',
      permissions: ['orders:status'],
    });
    mockIsApiKey.mockReturnValue(true);

    const result = await authorizeOrderRoute(makeRequest(), 'orders:status');

    expect(mockAuthorizeRequest).toHaveBeenCalledWith(expect.any(NextRequest), 'orders:status');
    expect(result).toEqual({ kind: 'api_key', actorId: 'api-key-1' });
  });
});
