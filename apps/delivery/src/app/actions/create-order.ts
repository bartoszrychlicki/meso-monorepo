'use server'

import { getPosApi } from '@/lib/pos-api';
import type { CreateOrderInput, Order } from '@meso/core';

export type CreateOrderActionResult =
  | { success: true; data: Order }
  | { success: false; error: string };

export async function createOrderAction(input: CreateOrderInput): Promise<CreateOrderActionResult> {
  try {
    const response = await getPosApi().orders.create(input);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error?.message || 'Nie udało się utworzyć zamówienia.',
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('[createOrderAction] Unexpected create order error:', error);
    return {
      success: false,
      error: 'Nie udało się utworzyć zamówienia. Spróbuj ponownie za chwilę.',
    };
  }
}
