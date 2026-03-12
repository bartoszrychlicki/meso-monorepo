import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListApiKeys = vi.fn();
const mockCreateApiKey = vi.fn();
const mockRevokeApiKey = vi.fn();
const mockDeleteApiKey = vi.fn();

vi.mock('@/lib/api-keys', () => ({
  listApiKeys: mockListApiKeys,
  createApiKey: mockCreateApiKey,
  revokeApiKey: mockRevokeApiKey,
  deleteApiKey: mockDeleteApiKey,
}));

describe('GET /api/v1/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns keys without exposing hashes', async () => {
    mockListApiKeys.mockResolvedValue([
      {
        id: 'key-1',
        name: 'Webhook key',
        key_prefix: 'meso_k1_abc...',
        key_hash: 'super-secret-hash',
        permissions: ['webhooks:manage'],
        is_active: true,
        created_by: 'admin',
        created_at: '2026-03-12T00:00:00.000Z',
        updated_at: '2026-03-12T00:00:00.000Z',
      },
    ]);

    const { GET } = await import('../api-keys/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Webhook key');
    expect(body.data[0].key_hash).toBeUndefined();
  });

  it('returns a structured error when listing fails', async () => {
    mockListApiKeys.mockRejectedValue(new Error('permission denied for table integrations_api_keys'));

    const { GET } = await import('../api-keys/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('API_KEYS_LIST_FAILED');
    expect(body.error.message).toContain('permission denied');
  });
});
