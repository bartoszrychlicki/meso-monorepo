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
import { authorizeMenuRoute } from '@/modules/menu/server/route-auth';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockAuthorizeRequest = authorizeRequest as ReturnType<typeof vi.fn>;
const mockIsApiKey = isApiKey as unknown as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/v1/menu/products/reorder');
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

describe('authorizeMenuRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows menu write for cashier session', async () => {
    const usersTable = createUsersTableMock({ role: 'cashier', is_active: true });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'cashier-1',
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

    const result = await authorizeMenuRoute(makeRequest(), 'menu:write');

    expect(result).toEqual({ kind: 'session', actorId: 'cashier-1' });
  });

  it('allows menu write for chef session', async () => {
    const usersTable = createUsersTableMock({ role: 'chef', is_active: true });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'chef-1',
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

    const result = await authorizeMenuRoute(makeRequest(), 'menu:write');

    expect(result).toEqual({ kind: 'session', actorId: 'chef-1' });
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
      permissions: ['menu:write'],
    });
    mockIsApiKey.mockReturnValue(true);

    const result = await authorizeMenuRoute(makeRequest(), 'menu:write');

    expect(mockAuthorizeRequest).toHaveBeenCalled();
    expect(result).toEqual({ kind: 'api_key', actorId: 'api-key-1' });
  });
});
