import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPickupTimeAdjustedEmailHtml,
  sendPickupTimeAdjustedEmail,
} from '../pickup-time-adjustment-email';

const mockSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: mockSend },
  })),
}));

describe('pickup-time-adjustment-email', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mesofood.pl');
    mockSend.mockReset();
  });

  it('builds html with previous and new pickup time', () => {
    const html = buildPickupTimeAdjustedEmailHtml({
      orderId: 'order-1',
      orderNumber: 'WEB-001',
      customerFirstName: 'Jan',
      customerEmail: 'jan@example.com',
      previousTime: '2026-03-17T12:30:00.000Z',
      newTime: '2026-03-17T12:45:00.000Z',
      trackingUrl: 'https://mesofood.pl/order-confirmation?orderId=order-1',
    });

    expect(html).toContain('Zmiana czasu odbioru');
    expect(html).toContain('WEB-001');
    expect(html).toContain('17 marca 13:30');
    expect(html).toContain('17 marca 13:45');
    expect(html).toContain('Sledz zamowienie');
  });

  it('sends pickup time adjustment email when customer email is present', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'msg_1' }, error: null });

    const result = await sendPickupTimeAdjustedEmail(
      {
        id: 'order-1',
        order_number: 'WEB-001',
        delivery_address: {
          firstName: 'Jan',
          email: 'jan@example.com',
        },
      },
      '2026-03-17T12:30:00.000Z',
      '2026-03-17T12:45:00.000Z'
    );

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jan@example.com',
        subject: expect.stringContaining('WEB-001'),
      })
    );
  });

  it('skips sending when email is missing', async () => {
    const result = await sendPickupTimeAdjustedEmail(
      {
        id: 'order-1',
        order_number: 'WEB-001',
        delivery_address: {
          firstName: 'Jan',
        },
      },
      '2026-03-17T12:30:00.000Z',
      '2026-03-17T12:45:00.000Z'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('email');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
