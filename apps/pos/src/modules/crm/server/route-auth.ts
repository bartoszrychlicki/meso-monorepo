import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authorizeRequest, isApiKey } from '@/lib/api/auth';
import type { ApiKeyPermission } from '@/types/api-key';

export type RouteActor =
  | { kind: 'session'; actorId: string }
  | { kind: 'api_key'; actorId: string | null };

export async function authorizeSessionOrApiKey(
  request: NextRequest,
  permission: ApiKeyPermission
): Promise<RouteActor | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
