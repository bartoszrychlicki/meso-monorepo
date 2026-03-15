import { describe, expect, it, vi, beforeEach } from 'vitest';
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
import { authorizeSessionOrApiKey } from '@/modules/crm/server/route-auth';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockAuthorizeRequest = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/v1/crm/promo-codes');
}

function createUsersTableMock(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
  const ilike = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, ilike }));

  return {
    query: { select },
    maybeSingle,
    eq,
    ilike,
  };
}

describe('authorizeSessionOrApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows crm write for admin session', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'admin@test.com',
              user_metadata: { app_role: 'staff', role: 'admin' },
            },
          },
        }),
      },
      from: vi.fn(),
    });

    const result = await authorizeSessionOrApiKey(makeRequest(), 'crm:write');

    expect(result).toEqual({ kind: 'session', actorId: 'user-1' });
  });

  it('forbids crm write for cashier session', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-2',
              email: 'cashier@test.com',
              user_metadata: { app_role: 'staff', role: 'cashier' },
            },
          },
        }),
      },
      from: vi.fn(),
    });

    const result = await authorizeSessionOrApiKey(makeRequest(), 'crm:write');

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it('falls back to users_users role for legacy staff session', async () => {
    const usersTable = createUsersTableMock({ role: 'manager' });
    const from = vi.fn((table: string) => {
      if (table === 'users_users') {
        return usersTable.query;
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-3',
              email: 'legacy@test.com',
              user_metadata: { app_role: 'staff' },
            },
          },
        }),
      },
      from,
    });

    const result = await authorizeSessionOrApiKey(makeRequest(), 'crm:write');

    expect(usersTable.eq).toHaveBeenCalledWith('id', 'user-3');
    expect(result).toEqual({ kind: 'session', actorId: 'user-3' });
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
      permissions: ['crm:write'],
    });
    mockIsApiKey.mockReturnValue(true);

    const result = await authorizeSessionOrApiKey(makeRequest(), 'crm:write');

    expect(mockAuthorizeRequest).toHaveBeenCalled();
    expect(result).toEqual({ kind: 'api_key', actorId: 'api-key-1' });
  });
});
