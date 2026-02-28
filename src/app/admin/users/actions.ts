'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const isAdmin = formData.get('is_admin') === 'true';

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      name,
      role: isAdmin ? 'admin' : 'cashier',
    },
  });

  if (error) {
    if (error.message.includes('already')) {
      return { error: 'Uzytkownik z tym adresem email juz istnieje. User already exists.' };
    }
    return { error: `Nie udalo sie utworzyc uzytkownika: ${error.message}` };
  }

  revalidatePath('/admin/users');
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

  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteStaffUser(userId: string) {
  const serviceClient = createServiceClient();

  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
  if (authError) {
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

  revalidatePath('/admin/users');
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

  revalidatePath('/admin/users');
  return { success: true };
}
