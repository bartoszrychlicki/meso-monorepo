import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
} from '@/lib/api/response';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
} from '@/lib/api-keys';
import { createClient } from '@/lib/supabase/server';
import { ApiKeyPermission, ALL_API_KEY_PERMISSIONS } from '@/types/api-key';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ApiKeyPermissionSchema = z.enum(
  ALL_API_KEY_PERMISSIONS as [ApiKeyPermission, ...ApiKeyPermission[]]
);

const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'Nazwa klucza jest wymagana').max(100),
  permissions: z
    .array(ApiKeyPermissionSchema)
    .min(1, 'Przynajmniej jedno uprawnienie jest wymagane'),
  expires_at: z.string().optional(),
});

const RevokeApiKeySchema = z.object({
  id: z.string().min(1, 'ID klucza jest wymagane'),
});

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * GET /api/v1/api-keys
 * List all API keys (internal endpoint, no API key auth required — uses session).
 * In the current prototype, this is open for the Settings UI.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError('UNAUTHORIZED', 'Wymagane zalogowanie użytkownika', 401);
  }

  try {
    const keys = await listApiKeys();

    // Strip sensitive data
    const safeKeys = keys.map(({ key_hash: _hash, ...rest }) => rest);
    return apiSuccess(safeKeys);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd';
    if (message.includes('row-level security policy')) {
      return apiError('FORBIDDEN', 'Brak uprawnień do listowania kluczy API', 403);
    }
    return apiError('INTERNAL_ERROR', 'Nie udało się pobrać kluczy API', 500);
  }
}

/**
 * POST /api/v1/api-keys
 * Create a new API key. Returns the raw key ONCE.
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError('UNAUTHORIZED', 'Wymagane zalogowanie użytkownika', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = CreateApiKeySchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const { name, permissions, expires_at } = validation.data;

  try {
    const { apiKey, rawKey } = await createApiKey({
      name,
      permissions: permissions as ApiKeyPermission[],
      created_by: userId,
      expires_at,
    });

    // Return the raw key — it can only be seen this one time
    const { key_hash: _hash, ...safeKey } = apiKey;
    return apiCreated({
      ...safeKey,
      raw_key: rawKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd';
    if (message.includes('row-level security policy')) {
      return apiError('FORBIDDEN', 'Brak uprawnień do utworzenia klucza API', 403);
    }
    return apiError('INTERNAL_ERROR', 'Nie udało się utworzyć klucza API', 500);
  }
}

/**
 * DELETE /api/v1/api-keys
 * Revoke or delete an API key.
 */
export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError('UNAUTHORIZED', 'Wymagane zalogowanie użytkownika', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Nieprawidłowe dane JSON w treści żądania', 400);
  }

  const validation = RevokeApiKeySchema.safeParse(body);
  if (!validation.success) {
    return apiValidationError(
      validation.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  }

  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';

  try {
    if (permanent) {
      await deleteApiKey(validation.data.id);
    } else {
      await revokeApiKey(validation.data.id);
    }

    return apiSuccess({ revoked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd';
    if (message.includes('row-level security policy')) {
      return apiError('FORBIDDEN', 'Brak uprawnień do usunięcia klucza API', 403);
    }
    return apiError('INTERNAL_ERROR', 'Nie udało się usunąć klucza API', 500);
  }
}
