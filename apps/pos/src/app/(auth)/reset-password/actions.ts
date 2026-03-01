'use server';

import { createClient } from '@/lib/supabase/server';

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: 'Nie udalo sie zaktualizowac hasla. Sprobuj ponownie.' };
  }

  return { success: true };
}
