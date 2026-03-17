import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import { apiForbidden } from '@/lib/api/response';
import type { ApiKeyPermission } from '@/types/api-key';

export type OrderRouteActor =
  | { kind: 'session'; actorId: string }
  | { kind: 'api_key'; actorId: string | null };

const SESSION_ROLE_PERMISSIONS: Record<string, ApiKeyPermission[]> = {
  admin: ['orders:read', 'orders:write', 'orders:status'],
  manager: ['orders:read', 'orders:write', 'orders:status'],
  cashier: ['orders:read', 'orders:write', 'orders:status'],
  chef: ['orders:read', 'orders:status'],
};

async function resolveSessionRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: {
    id: string;
    email?: string | null;
  }
): Promise<string | null> {
  const { data: staffUserById } = await supabase
    .from('users_users')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (
    staffUserById &&
    staffUserById.is_active === true &&
    typeof staffUserById.role === 'string'
  ) {
    return staffUserById.role;
  }

  if (!user.email) {
    return null;
  }

  const normalizedEmail = user.email.trim().toLowerCase();

  const { data: staffUserByEmail } = await supabase
    .from('users_users')
    .select('role, is_active')
    .eq('email', normalizedEmail)
    .maybeSingle();

  return (
    staffUserByEmail &&
    staffUserByEmail.is_active === true &&
    typeof staffUserByEmail.role === 'string'
  )
    ? staffUserByEmail.role
    : null;
}

export async function authorizeOrderRoute(
  request: NextRequest,
  permission: ApiKeyPermission
): Promise<OrderRouteActor | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const sessionRole = await resolveSessionRole(supabase, user);
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
