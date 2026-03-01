'use server'

import { getPosApi } from '@/lib/pos-api';
import type { CreateOrderInput } from '@meso/core';

export async function createOrderAction(input: CreateOrderInput) {
  const response = await getPosApi().orders.create(input);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create order');
  }
  return response.data!;
}
