import { NextRequest } from 'next/server';
import { ApiKey, ApiKeyPermission } from '@/types/api-key';
import { validateApiKey, hasPermission } from '@/lib/api-keys';
import { apiUnauthorized, apiForbidden } from './response';

export interface AuthenticatedRequest {
  apiKey: ApiKey;
}

/**
 * Authenticate a request using X-API-Key header.
 * Returns the validated ApiKey or a NextResponse error.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<ApiKey | ReturnType<typeof apiUnauthorized>> {
  const apiKeyHeader = request.headers.get('X-API-Key');

  if (!apiKeyHeader) {
    return apiUnauthorized();
  }

  const apiKey = await validateApiKey(apiKeyHeader);

  if (!apiKey) {
    return apiUnauthorized();
  }

  return apiKey;
}

/**
 * Authenticate and check permissions in one step.
 * Returns the ApiKey if authorized, or a NextResponse error.
 */
export async function authorizeRequest(
  request: NextRequest,
  requiredPermission: ApiKeyPermission
): Promise<ApiKey | ReturnType<typeof apiUnauthorized | typeof apiForbidden>> {
  const result = await authenticateRequest(request);

  // If result is a Response (error), return it
  if (!(result && 'id' in result)) {
    return result;
  }

  if (!hasPermission(result, requiredPermission)) {
    return apiForbidden(requiredPermission);
  }

  return result;
}

/** Type guard to check if auth result is a valid ApiKey */
export function isApiKey(result: unknown): result is ApiKey {
  return result !== null && typeof result === 'object' && 'id' in result && 'permissions' in result;
}
