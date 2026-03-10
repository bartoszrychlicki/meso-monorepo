import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockBuildPosbistroConfirmBaseUrl, mockRetryPending } = vi.hoisted(() => ({
  mockBuildPosbistroConfirmBaseUrl: vi.fn((origin?: string) =>
    `${origin || 'http://localhost:3000'}/api/integrations/posbistro/confirm`
  ),
  mockRetryPending: vi.fn(),
}));

vi.mock('@/lib/integrations/posbistro/service', () => ({
  buildPosbistroConfirmBaseUrl: mockBuildPosbistroConfirmBaseUrl,
  retryPendingPosbistroExports: mockRetryPending,
}));

import { POST } from '../route';

describe('POST /api/cron/integrations/posbistro/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSBISTRO_CRON_SECRET = 'cron-secret';
  });

  it('returns 401 when secret header is invalid', async () => {
    const res = await POST(
      new NextRequest('http://localhost:3000/api/cron/integrations/posbistro/retry', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer wrong',
        },
      } as never)
    );

    expect(res.status).toBe(401);
  });

  it('returns retry summary on success', async () => {
    mockRetryPending.mockResolvedValue({
      processed: 2,
      succeeded: 1,
      failed: 1,
    });

    const res = await POST(
      new NextRequest('http://localhost:3000/api/cron/integrations/posbistro/retry', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer cron-secret',
        },
      } as never)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      processed: 2,
      succeeded: 1,
      failed: 1,
    });
  });
});
