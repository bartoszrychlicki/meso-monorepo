import type {
  ApiResponse,
  CancelOrderInput,
  Order,
  P24RefundRecord,
  CreateOrderInput,
  UpdateOrderStatusInput,
} from '@meso/core';
import { OrderStatus } from '@meso/core';
import type { MesoClient } from './client';

export class OrdersApi {
  constructor(private client: MesoClient) {}

  async create(input: CreateOrderInput): Promise<ApiResponse<Order>> {
    return this.client.request<Order>('POST', '/orders', input);
  }

  async getById(orderId: string): Promise<ApiResponse<Order>> {
    return this.client.request<Order>('GET', `/orders/${orderId}`);
  }

  async updateStatus(
    orderId: string,
    input: UpdateOrderStatusInput
  ): Promise<ApiResponse<Order>> {
    return this.client.request<Order>(
      'PATCH',
      `/orders/${orderId}/status`,
      input
    );
  }

  async cancel(
    orderId: string,
    input: CancelOrderInput
  ): Promise<ApiResponse<{
    order: Order
    refund: {
      status: 'not_requested' | 'requested' | 'manual_action_required'
      message?: string
      refund?: P24RefundRecord
    }
  }>> {
    return this.client.request<{
      order: Order
      refund: {
        status: 'not_requested' | 'requested' | 'manual_action_required'
        message?: string
        refund?: P24RefundRecord
      }
    }>(
      'POST',
      `/orders/${orderId}/cancel`,
      input
    );
  }

  async list(params?: {
    page?: number;
    per_page?: number;
    status?: OrderStatus;
    date_from?: string;
    date_to?: string;
    customer?: string;
  }): Promise<ApiResponse<Order[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.client.request<Order[]>(
      'GET',
      `/orders${query ? `?${query}` : ''}`
    );
  }
}
