import type { ApiResponse } from '@meso/core';
import type { MesoClient } from './client';

export interface UpdateCustomerInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

export class CustomersApi {
  constructor(private client: MesoClient) {}

  async update(
    customerId: string,
    input: UpdateCustomerInput
  ): Promise<ApiResponse<unknown>> {
    return this.client.request('PUT', `/crm/customers/${customerId}`, input);
  }

  async findByPhone(phone: string): Promise<ApiResponse<unknown>> {
    return this.client.request('GET', `/crm/customers?phone=${encodeURIComponent(phone)}`);
  }
}
