import { NextRequest } from 'next/server';
import {
  apiError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { cancelOrderWithOptionalRefund } from '@/lib/orders/cancel-order';
import {
  InvalidOrderCancellationReasonError,
  OrderNotFoundError,
} from '@/lib/orders/status-transition';
import { authorizeOrderRoute } from '@/modules/orders/server/route-auth';
import { CancelOrderSchema } from '@/schemas/order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function authorizeOrderCancellation(request: NextRequest) {
  const access = await authorizeOrderRoute(request, 'orders:status');
  if ('status' in access) {
    return access;
  }

  return { changedBy: access.actorId, authType: access.kind };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeOrderCancellation(request);
  if ('status' in auth) return auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidlowe dane JSON w tresci zadania', 400);
  }

  const validation = CancelOrderSchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  try {
    const changedBy: string | undefined = auth.authType === 'api_key'
      ? (validation.data.changed_by ?? auth.changedBy ?? undefined)
      : auth.changedBy ?? undefined;

    const result = await cancelOrderWithOptionalRefund({
      orderId: id,
      closure_reason_code: validation.data.closure_reason_code,
      closure_reason: validation.data.closure_reason,
      request_refund: validation.data.request_refund,
      requested_from: validation.data.requested_from,
      changed_by: changedBy,
      requestOrigin: request.nextUrl.origin,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return apiNotFound('Zamowienie');
    }

    if (error instanceof InvalidOrderCancellationReasonError) {
      return apiError(
        'INVALID_CANCELLATION_REASON',
        'Powod anulowania jest wymagany',
        422
      );
    }

    return apiError(
      'ORDER_CANCEL_FAILED',
      'Nie udalo sie anulowac zamowienia',
      500,
      [error]
    );
  }
}
