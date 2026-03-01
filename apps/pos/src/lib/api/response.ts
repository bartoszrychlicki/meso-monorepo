import { NextResponse } from 'next/server';

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function apiSuccess<T>(
  data: T,
  meta?: { total?: number; page?: number; per_page?: number }
): NextResponse<ApiResponseBody<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}

export function apiCreated<T>(data: T): NextResponse<ApiResponseBody<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    },
    { status: 201 }
  );
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown[]
): NextResponse<ApiResponseBody<never>> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
      meta: { timestamp: new Date().toISOString() },
    },
    { status }
  );
}

export function apiNotFound(
  resource: string
): NextResponse<ApiResponseBody<never>> {
  return apiError('NOT_FOUND', `${resource} nie znaleziono`, 404);
}

export function apiUnauthorized(): NextResponse<ApiResponseBody<never>> {
  return apiError(
    'UNAUTHORIZED',
    'Brak lub nieprawidłowy klucz API. Użyj nagłówka X-API-Key.',
    401
  );
}

export function apiForbidden(
  permission: string
): NextResponse<ApiResponseBody<never>> {
  return apiError(
    'FORBIDDEN',
    `Brak wymaganego uprawnienia: ${permission}`,
    403
  );
}

export function apiValidationError(
  details: unknown[]
): NextResponse<ApiResponseBody<never>> {
  return apiError('VALIDATION_ERROR', 'Błąd walidacji danych', 422, details);
}
