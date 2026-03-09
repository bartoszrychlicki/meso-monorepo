import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SEEDED_LOCATION,
  type RemoteE2ERunContext,
} from './run-context';
import { getRequiredEnv, getSupabaseServiceKey, loadPosEnv } from './env';

type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
};

export function assertRemoteSupabaseE2EEnv(): void {
  loadPosEnv();

  if (process.env.NEXT_PUBLIC_DATA_BACKEND !== 'supabase') {
    throw new Error(
      'Remote POS E2E requires NEXT_PUBLIC_DATA_BACKEND=supabase.'
    );
  }

  getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (!getSupabaseServiceKey()) {
    throw new Error(
      'Remote POS E2E requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
}

export function createAdminClient(): SupabaseClient {
  assertRemoteSupabaseE2EEnv();

  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getSupabaseServiceKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function listAllAuthUsers(admin: SupabaseClient): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const batch = (data?.users ?? []) as AuthUser[];
    users.push(...batch);

    if (batch.length < 200) {
      break;
    }

    page += 1;
  }

  return users;
}

export async function deleteAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<void> {
  const users = await listAllAuthUsers(admin);
  const matches = users.filter((user) => user.email?.toLowerCase() === email.toLowerCase());

  await Promise.all(
    matches.map(async (user) => {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error && !/user not found/i.test(error.message)) {
        throw new Error(`Failed to delete auth user ${email}: ${error.message}`);
      }
    })
  );
}

export async function provisionRunUser(
  admin: SupabaseClient,
  context: RemoteE2ERunContext
): Promise<RemoteE2ERunContext> {
  const { data, error } = await admin.auth.admin.createUser({
    email: context.email,
    password: context.password,
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      role: 'admin',
      name: context.fullName,
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user: ${error?.message ?? 'unknown error'}`);
  }

  const userId = data.user.id;
  const { error: upsertError } = await admin
    .from('users_users')
    .upsert(
      {
        id: userId,
        email: context.email,
        name: context.fullName,
        username: context.username,
        role: 'admin',
        location_id: SEEDED_LOCATION.id,
        is_active: true,
      },
      { onConflict: 'id' }
    );

  if (upsertError) {
    throw new Error(`Failed to upsert users_users record: ${upsertError.message}`);
  }

  return {
    ...context,
    userId,
  };
}
