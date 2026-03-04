import { ApiKey, ApiKeyPermission } from '@/types/api-key';
import { createRepository } from '@/lib/data/repository-factory';
import { createServiceClient } from '@/lib/supabase/server';

const apiKeysRepository = createRepository<ApiKey>('api_keys');

/** Generate a cryptographically random API key string */
export function generateApiKeyString(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `meso_k1_${base64}`;
}

/** Hash an API key using SHA-256 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Create a new API key and return both the stored record and the raw key (shown once) */
export async function createApiKey(params: {
  name: string;
  permissions: ApiKeyPermission[];
  created_by: string;
  expires_at?: string;
}): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const rawKey = generateApiKeyString();
  const keyHash = await hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12) + '...';

  const apiKey = await apiKeysRepository.create({
    name: params.name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    permissions: params.permissions,
    is_active: true,
    created_by: params.created_by,
    expires_at: params.expires_at,
  });

  return { apiKey, rawKey };
}

/** Validate an API key and return the key record if valid.
 *  Uses service_role client to bypass RLS (called from API routes without user session). */
export async function validateApiKey(rawKey: string): Promise<ApiKey | null> {
  const keyHash = await hashApiKey(rawKey);

  const supabase = createServiceClient();
  const { data: keys } = await supabase
    .from('integrations_api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true);

  if (!keys || keys.length === 0) return null;

  const apiKey = keys[0] as ApiKey;

  // Check expiration
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('integrations_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  return apiKey;
}

/** Check if an API key has a specific permission */
export function hasPermission(
  apiKey: ApiKey,
  permission: ApiKeyPermission
): boolean {
  return apiKey.permissions.includes(permission);
}

/** Revoke (deactivate) an API key */
export async function revokeApiKey(id: string): Promise<void> {
  await apiKeysRepository.update(id, { is_active: false } as Partial<ApiKey>);
}

/** List all API keys (without exposing hashes) */
export async function listApiKeys(): Promise<ApiKey[]> {
  const result = await apiKeysRepository.findAll({ per_page: 100 });
  return result.data;
}

/** Delete an API key permanently */
export async function deleteApiKey(id: string): Promise<void> {
  await apiKeysRepository.delete(id);
}

export { apiKeysRepository };
