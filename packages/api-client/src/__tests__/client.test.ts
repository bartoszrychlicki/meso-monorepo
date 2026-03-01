import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MesoClient } from '../client';
import { ApiError, NetworkError } from '../errors';

describe('MesoClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends request with API key header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { id: '123' } }),
      status: 200,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new MesoClient({
      baseUrl: 'https://pos.example.com',
      apiKey: 'test-key',
      maxRetries: 0,
    });

    await client.request('POST', '/orders', { items: [] });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://pos.example.com/api/v1/orders',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-API-Key': 'test-key',
        }),
      })
    );
  });

  it('throws ApiError on 4xx without retry', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Bad input' },
      }),
      status: 422,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new MesoClient({
      baseUrl: 'https://pos.example.com',
      apiKey: 'test-key',
      maxRetries: 2,
    });

    await expect(client.request('POST', '/orders', {})).rejects.toThrow(ApiError);
    // Should NOT retry on 4xx — only 1 call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 errors', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Server error' },
        }),
        status: 500,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { id: '123' } }),
        status: 200,
      });
    vi.stubGlobal('fetch', mockFetch);

    const client = new MesoClient({
      baseUrl: 'https://pos.example.com',
      apiKey: 'test-key',
      maxRetries: 2,
    });

    const result = await client.request('GET', '/orders/123');
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
