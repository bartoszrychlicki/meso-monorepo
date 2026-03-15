import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { apiForbidden } from '@/lib/api/response';
import type { ApiKeyPermission } from '@/types/api-key';

export type RouteActor =
  | { kind: 'session'; actorId: string }
  | { kind: 'api_key'; actorId: string | null };

const SESSION_ROLE_PERMISSIONS: Record<string, ApiKeyPermission[]> = {
  admin: ['crm:read', 'crm:write'],
  manager: ['crm:read', 'crm:write'],
  cashier: ['crm:read'],
};

async function resolveSessionRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }
): Promise<string | null> {
  const roleFromMetadata =
    typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null;
  if (roleFromMetadata) {
    return roleFromMetadata;
  }

  const { data: staffUserById } = await supabase
    .from('users_users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (staffUserById && typeof staffUserById.role === 'string') {
    return staffUserById.role;
  }

  if (!user.email) {
    return null;
  }

  const { data: staffUserByEmail } = await supabase
    .from('users_users')
    .select('role')
    .ilike('email', user.email)
    .maybeSingle();

  return staffUserByEmail && typeof staffUserByEmail.role === 'string'
    ? staffUserByEmail.role
    : null;
}

export async function authorizeSessionOrApiKey(
  request: NextRequest,
  permission: ApiKeyPermission
): Promise<RouteActor | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const sessionRole = (await resolveSessionRole(supabase, user)) ??
      (user.user_metadata?.app_role === 'staff' ? 'cashier' : null);

    const allowedPermissions =
      sessionRole && sessionRole in SESSION_ROLE_PERMISSIONS
        ? SESSION_ROLE_PERMISSIONS[sessionRole]
        : [];

    if (!allowedPermissions.includes(permission)) {
      return apiForbidden(permission);
    }

    return {
      kind: 'session',
      actorId: user.id,
    };
  }

  const auth = await authorizeRequest(request, permission);
  if (!isApiKey(auth)) {
    return auth;
  }

  return {
    kind: 'api_key',
    actorId: auth.id ?? null,
  };
}
