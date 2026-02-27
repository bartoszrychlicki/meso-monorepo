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

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      name,
      role: 'cashier',
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

export async function resetStaffPassword(userId: string) {
  const serviceClient = createServiceClient();
  const { data: userData, error: getUserError } =
    await serviceClient.auth.admin.getUserById(userId);

  if (getUserError || !userData.user?.email) {
    return { error: 'Nie znaleziono uzytkownika.' };
  }

  const { error } = await serviceClient.auth.resetPasswordForEmail(
    userData.user.email
  );

  if (error) {
    return { error: 'Nie udalo sie wyslac linku resetujacego.' };
  }

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
