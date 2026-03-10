import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { handlePosbistroConfirmation } from '@/lib/integrations/posbistro/service';

export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return apiError('MISSING_TOKEN', 'Brak tokenu potwierdzenia POSBistro', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const status =
    body && typeof body === 'object' && 'status' in body
      ? (body as { status?: unknown }).status
      : undefined;
  const normalizedStatus =
    typeof status === 'string' ? status.toLowerCase() : undefined;

  if (normalizedStatus !== 'accepted' && normalizedStatus !== 'rejected') {
    return apiValidationError([
      {
        field: 'status',
        message: 'Status musi mieć wartość accepted albo rejected',
      },
    ]);
  }

  try {
    const result = await handlePosbistroConfirmation(
      {
        ...(body as Record<string, unknown>),
        status: normalizedStatus,
      } as {
        status: 'accepted' | 'rejected';
        orderId?: string;
        reason?: string;
        message?: string;
        comment?: string;
      },
      { token }
    );

    return apiSuccess({
      status: result.integration.status,
      order_status: result.order?.status ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'POSBISTRO_CONFIRMATION_NOT_FOUND') {
      return apiError('NOT_FOUND', 'Nie znaleziono potwierdzenia POSBistro', 404);
    }

    return apiError(
      'POSBISTRO_CONFIRMATION_FAILED',
      'Nie udało się przetworzyć callbacku POSBistro',
      500
    );
  }
}
