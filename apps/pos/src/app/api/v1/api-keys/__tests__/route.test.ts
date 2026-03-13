import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockCreateApiKey = vi.fn();
const mockListApiKeys = vi.fn();
const mockRevokeApiKey = vi.fn();
const mockDeleteApiKey = vi.fn();

vi.mock('@/lib/api-keys', () => ({
  createApiKey: mockCreateApiKey,
  listApiKeys: mockListApiKeys,
  revokeApiKey: mockRevokeApiKey,
  deleteApiKey: mockDeleteApiKey,
}));

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

describe('api-keys route auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for GET when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import('../route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('uses authenticated user id as created_by in POST', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockCreateApiKey.mockResolvedValue({
      apiKey: {
        id: 'key-1',
        name: 'Webhook key',
        permissions: ['webhooks:manage'],
        key_hash: 'hashed',
      },
      rawKey: 'meso_k1_abc',
    });

    const { POST } = await import('../route');
    const res = await POST(
      makeRequest('/api/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Webhook key',
          permissions: ['webhooks:manage'],
        }),
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(res.status).toBe(201);
    expect(mockCreateApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: 'user-123',
      })
    );
  });

  it('returns 403 instead of throwing on RLS error in POST', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockCreateApiKey.mockRejectedValue(
      new Error('new row violates row-level security policy for table "integrations_api_keys"')
    );

    const { POST } = await import('../route');
    const res = await POST(
      makeRequest('/api/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Webhook key',
          permissions: ['webhooks:manage'],
        }),
        headers: { 'content-type': 'application/json' },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
