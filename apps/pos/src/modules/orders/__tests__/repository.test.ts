import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatus } from '@/types/enums';

const { mockOrderFindById, mockOrderUpdate, mockKitchenTicketsIn, mockKitchenTicketsEq, mockKitchenTicketsUpdate } = vi.hoisted(() => ({
  mockOrderFindById: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockKitchenTicketsIn: vi.fn(),
  mockKitchenTicketsEq: vi.fn(),
  mockKitchenTicketsUpdate: vi.fn(),
}));

vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: vi.fn(() => ({
    findById: mockOrderFindById,
    update: mockOrderUpdate,
    findMany: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  })),
}));

vi.mock('@/modules/crm/repository', () => ({
  crmRepository: {
    customers: { findById: vi.fn() },
    findCustomerByPhone: vi.fn(),
    addLoyaltyTransaction: vi.fn(),
    updateOrderStats: vi.fn(),
  },
}));

vi.mock('@/modules/crm/utils/loyalty-calculator', () => ({
  BONUS_POINTS: { FIRST_ORDER: 50 },
  calculatePointsFromOrder: vi.fn(() => 0),
}));

vi.mock('@/lib/sms/sms-provider', () => ({
  sendSMS: vi.fn(),
}));

vi.mock('@/lib/sms/templates', () => ({
  getOrderStatusSMS: vi.fn(() => null),
  isValidPhoneNumber: vi.fn(() => true),
  formatPhoneForSMS: vi.fn((phone: string) => phone),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== 'orders_kitchen_tickets') {
        throw new Error(`Unexpected table access in test: ${table}`);
      }

      return {
        update: mockKitchenTicketsUpdate,
      };
    }),
    rpc: vi.fn(),
  },
}));

import { ordersRepository } from '../repository';
import { crmRepository } from '@/modules/crm/repository';
import { sendSMS } from '@/lib/sms/sms-provider';
import { getOrderStatusSMS } from '@/lib/sms/templates';

const mockFindCustomerByPhone = crmRepository.findCustomerByPhone as ReturnType<typeof vi.fn>;
const mockAddLoyaltyTransaction = crmRepository.addLoyaltyTransaction as ReturnType<typeof vi.fn>;
const mockUpdateOrderStats = crmRepository.updateOrderStats as ReturnType<typeof vi.fn>;
const mockSendSMS = sendSMS as ReturnType<typeof vi.fn>;
const mockGetOrderStatusSMS = getOrderStatusSMS as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();

describe('ordersRepository.updateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'supabase');
    vi.stubGlobal('fetch', mockFetch);
    mockKitchenTicketsUpdate.mockReturnValue({ eq: mockKitchenTicketsEq });
    mockKitchenTicketsEq.mockReturnValue({ in: mockKitchenTicketsIn });
    mockKitchenTicketsIn.mockResolvedValue({ error: null });
  });

  it('uses the status API route for supabase-backed cancellations from the UI repository path', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'order-1',
          order_number: 'WEB-20260303-001',
          status: OrderStatus.CANCELLED,
          status_history: [
            { status: OrderStatus.CONFIRMED, timestamp: '2026-03-03T10:00:00.000Z' },
            { status: OrderStatus.CANCELLED, timestamp: '2026-03-03T10:05:00.000Z', note: 'Test' },
          ],
          customer_phone: undefined,
        },
      }),
    });

    await ordersRepository.updateStatus('order-1', OrderStatus.CANCELLED, 'Test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/orders/order-1/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: OrderStatus.CANCELLED,
          note: 'Test',
          closure_reason_code: undefined,
          closure_reason: undefined,
        }),
      })
    );
    expect(mockKitchenTicketsUpdate).not.toHaveBeenCalled();
  });

  it('does not award loyalty twice in supabase mode when an order becomes delivered', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'order-1',
          order_number: 'WEB-20260303-001',
          status: OrderStatus.DELIVERED,
          status_history: [
            { status: OrderStatus.READY, timestamp: '2026-03-03T10:00:00.000Z' },
            { status: OrderStatus.DELIVERED, timestamp: '2026-03-03T10:05:00.000Z' },
          ],
          customer_phone: '+48500100100',
          loyalty_points_earned: 87,
        },
      }),
    });
    mockGetOrderStatusSMS.mockReturnValue('sms');
    mockSendSMS.mockResolvedValue({ success: true });
    mockFindCustomerByPhone.mockResolvedValue({ marketing_consent: true });

    await ordersRepository.updateStatus('order-1', OrderStatus.DELIVERED, 'Wydano');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/orders/order-1/status',
      expect.objectContaining({
        method: 'PATCH',
      })
    );
    expect(mockAddLoyaltyTransaction).not.toHaveBeenCalled();
    expect(mockUpdateOrderStats).not.toHaveBeenCalled();
    expect(mockSendSMS).toHaveBeenCalledTimes(1);
    expect(mockGetOrderStatusSMS).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.DELIVERED }),
      OrderStatus.DELIVERED,
      undefined
    );
  });
});
