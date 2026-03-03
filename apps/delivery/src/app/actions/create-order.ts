'use server'

import { getPosApi } from '@/lib/pos-api';
import { ApiError } from '@meso/api-client';
import type { CreateOrderInput, Order } from '@meso/core';

export type CreateOrderActionResult =
  | { success: true; data: Order }
  | { success: false; error: string };

type ValidationDetail = {
  field?: string;
  message?: string;
};

type ApiErrorLike = {
  name?: string;
  code?: string;
  status?: number;
  details?: unknown;
  message?: string;
};

function isValidationDetail(value: unknown): value is ValidationDetail {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.field === 'string' || record.field === undefined) &&
    (typeof record.message === 'string' || record.message === undefined)
  );
}

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as ApiErrorLike;

  const hasApiShape =
    typeof candidate.code === 'string' &&
    typeof candidate.status === 'number';

  return candidate instanceof ApiError || candidate.name === 'ApiError' || hasApiShape;
}

function humanizeValidationField(field: string): string {
  if (field.startsWith('items.')) return 'Pozycje zamówienia';
  if (field.startsWith('delivery_address.')) return 'Adres odbioru';

  const directMap: Record<string, string> = {
    location_id: 'Lokalizacja',
    customer_name: 'Imię i nazwisko',
    customer_phone: 'Numer telefonu',
    payment_method: 'Metoda płatności',
    payment_status: 'Status płatności',
    promo_code: 'Kod promocyjny',
    delivery_type: 'Typ odbioru',
    scheduled_time: 'Czas odbioru',
  };

  return directMap[field] || field;
}

function mapValidationDetailsToMessage(details: unknown): string {
  if (!Array.isArray(details) || details.length === 0) {
    return 'Nieprawidłowe dane zamówienia. Sprawdź formularz i spróbuj ponownie.';
  }

  const items = details
    .map((detail) => {
      if (!isValidationDetail(detail) || !detail.message) return null;
      if (!detail.field) return detail.message;
      return `${humanizeValidationField(detail.field)}: ${detail.message}`;
    })
    .filter((message): message is string => Boolean(message))
    .slice(0, 3);

  if (items.length === 0) {
    return 'Nieprawidłowe dane zamówienia. Sprawdź formularz i spróbuj ponownie.';
  }

  return `Popraw dane zamówienia: ${items.join(' ')}`;
}

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
    if (isApiErrorLike(error)) {
      if (error.code === 'VALIDATION_ERROR') {
        return {
          success: false,
          error: mapValidationDetailsToMessage(error.details),
        };
      }

      return {
        success: false,
        error: error.message || 'Nie udało się utworzyć zamówienia.',
      };
    }

    console.error('[createOrderAction] Unexpected create order error:', error);
    return {
      success: false,
      error: 'Nie udało się utworzyć zamówienia. Spróbuj ponownie za chwilę.',
    };
  }
}
