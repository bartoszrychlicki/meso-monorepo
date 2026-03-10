import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockHandleConfirmation } = vi.hoisted(() => ({
  mockHandleConfirmation: vi.fn(),
}));

vi.mock('@/lib/integrations/posbistro/service', () => ({
  handlePosbistroConfirmation: mockHandleConfirmation,
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>, token?: string) {
  const suffix = token ? `?token=${token}` : '';
  return new NextRequest(`http://localhost:3000/api/integrations/posbistro/confirm${suffix}`, {
    method: 'POST',
    body: JSON.stringify(body),
  } as never);
}

describe('POST /api/integrations/posbistro/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for accepted callback', async () => {
    mockHandleConfirmation.mockResolvedValue({
      integration: { status: 'accepted' },
      order: null,
    });

    const res = await POST(
      makeRequest(
        {
          status: 'accepted',
          orderId: 'pb-100',
        },
        'token-1'
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('accepted');
  });

  it('returns 400 when token is missing', async () => {
    const res = await POST(
      makeRequest({
        status: 'accepted',
        orderId: 'pb-100',
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 404 for invalid token', async () => {
    mockHandleConfirmation.mockRejectedValue(new Error('POSBISTRO_CONFIRMATION_NOT_FOUND'));

    const res = await POST(
      makeRequest(
        {
          status: 'accepted',
        },
        'bad-token'
      )
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
