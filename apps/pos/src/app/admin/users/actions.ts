'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const STAFF_USERS_PATH = '/admin/users';
const STAFF_USER_EXISTS_ERROR =
  'Nie mozna dodac uzytkownika. Konto pracownika z tym adresem email juz istnieje.';
const SHARED_EMAIL_ACCOUNT_ERROR =
  'Nie mozna dodac uzytkownika do POS. Ten adres email jest juz przypisany do konta klienta. Uzyj innego adresu email.';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildStaffDirectoryUser(params: {
  id: string;
  email: string;
  name: string;
  role: string;
}) {
  const usernameBase = params.email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '') || 'staff';

  return {
    id: params.id,
    email: params.email,
    name: params.name,
    username: `${usernameBase}-${params.id.slice(0, 8)}`,
    role: params.role,
    is_active: true,
  };
}

async function findAuthUserByEmail(serviceClient: ReturnType<typeof createServiceClient>, email: string) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { user: null, error };
    }

    const matchingUser =
      data.users.find((candidate) => normalizeEmail(candidate.email ?? '') === email) ?? null;

    if (matchingUser) {
      return { user: matchingUser, error: null };
    }

    if (!data.nextPage || data.nextPage <= page) {
      return { user: null, error: null };
    }

    page = data.nextPage;
  }
}

export async function getStaffUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users_users')
    .select('*');

  if (error) {
    return { data: [] };
  }
  return { data: data || [] };
}

export async function createStaffUser(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const isAdmin = formData.get('is_admin') === 'true';
  const role = isAdmin ? 'admin' : 'cashier';

  const serviceClient = createServiceClient();

  const { data: existingStaffUser, error: existingStaffUserError } = await serviceClient
    .from('users_users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existingStaffUserError && existingStaffUserError.code !== 'PGRST116') {
    return { error: `Nie udalo sie sprawdzic istniejacego uzytkownika: ${existingStaffUserError.message}` };
  }

  if (existingStaffUser) {
    return { error: STAFF_USER_EXISTS_ERROR };
  }

  const { error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      name,
      role,
    },
  });

  if (error) {
    if (error.message.includes('already')) {
      const { user: existingAuthUser, error: lookupError } = await findAuthUserByEmail(
        serviceClient,
        email
      );

      if (lookupError) {
        return { error: `Nie udalo sie sprawdzic istniejacego konta: ${lookupError.message}` };
      }

      if (!existingAuthUser) {
        return { error: STAFF_USER_EXISTS_ERROR };
      }

      if (existingAuthUser.user_metadata?.app_role && existingAuthUser.user_metadata.app_role !== 'staff') {
        return { error: SHARED_EMAIL_ACCOUNT_ERROR };
      }

      const { data: existingStaffRecord, error: existingStaffRecordError } = await serviceClient
        .from('users_users')
        .select('id')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      if (existingStaffRecordError && existingStaffRecordError.code !== 'PGRST116') {
        return {
          error: `Nie udalo sie sprawdzic powiazanego konta pracownika: ${existingStaffRecordError.message}`,
        };
      }

      if (existingStaffRecord) {
        return { error: STAFF_USER_EXISTS_ERROR };
      }

      const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            ...existingAuthUser.user_metadata,
            app_role: 'staff',
            name,
            role,
          },
        }
      );

      if (updateAuthError) {
        return { error: `Nie udalo sie odzyskac istniejacego konta: ${updateAuthError.message}` };
      }

      const { error: syncStaffError } = await serviceClient
        .from('users_users')
        .upsert(buildStaffDirectoryUser({
          id: existingAuthUser.id,
          email,
          name,
          role,
        }), { onConflict: 'id' });

      if (syncStaffError) {
        return { error: `Nie udalo sie zsynchronizowac konta pracownika: ${syncStaffError.message}` };
      }

      revalidatePath(STAFF_USERS_PATH);
      return { success: true };
    }

    return { error: `Nie udalo sie utworzyc uzytkownika: ${error.message}` };
  }

  revalidatePath(STAFF_USERS_PATH);
  return { success: true };
}

export async function resetStaffPassword(userId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Haslo musi miec co najmniej 6 znakow.' };
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return { error: `Nie udalo sie ustawic nowego hasla: ${error.message}` };
  }

  return { success: true };
}

export async function toggleStaffAdmin(userId: string, makeAdmin: boolean) {
  const serviceClient = createServiceClient();
  const newRole = makeAdmin ? 'admin' : 'cashier';

  const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole },
  });

  if (authError) {
    return { error: `Nie udalo sie zaktualizowac roli: ${authError.message}` };
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from('users_users')
    .update({ role: newRole })
    .eq('id', userId);

  if (dbError) {
    return { error: `Nie udalo sie zaktualizowac roli w bazie: ${dbError.message}` };
  }

  revalidatePath(STAFF_USERS_PATH);
  return { success: true };
}

export async function deleteStaffUser(userId: string) {
  const serviceClient = createServiceClient();

  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
  if (authError && !authError.message.includes('not found')) {
    return { error: `Nie udalo sie usunac uzytkownika z auth: ${authError.message}` };
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from('users_users')
    .delete()
    .eq('id', userId);

  if (dbError) {
    return { error: `Nie udalo sie usunac uzytkownika z bazy: ${dbError.message}` };
  }

  revalidatePath(STAFF_USERS_PATH);
  return { success: true };
}

export async function toggleStaffActive(userId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('users_users')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) {
    return { error: 'Nie udalo sie zmienic statusu uzytkownika.' };
  }

  revalidatePath(STAFF_USERS_PATH);
  return { success: true };
}
