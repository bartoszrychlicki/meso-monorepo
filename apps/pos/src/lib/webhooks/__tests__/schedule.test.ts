import { describe, expect, it, vi, beforeEach } from 'vitest';
import { scheduleWebhookDispatch } from '../schedule';
import { dispatchWebhook } from '../dispatcher';

vi.mock('../dispatcher', () => ({
  dispatchWebhook: vi.fn(),
}));

const mockDispatchWebhook = dispatchWebhook as unknown as ReturnType<typeof vi.fn>;

describe('scheduleWebhookDispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches webhooks with bounded request-path timeout settings', async () => {
    mockDispatchWebhook.mockResolvedValue([]);

    await scheduleWebhookDispatch('order.status_changed', { orderId: 'order-1' });

    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'order.status_changed',
      { orderId: 'order-1' },
      {
        timeoutMs: 1500,
        maxRetries: 0,
      }
    );
  });

  it('swallows dispatch errors to avoid breaking the request flow', async () => {
    const error = new Error('worker unavailable');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDispatchWebhook.mockRejectedValue(error);

    await expect(
      scheduleWebhookDispatch('order.status_changed', { orderId: 'order-1' })
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Webhook dispatch failed:', error);

    consoleErrorSpy.mockRestore();
  });
});
