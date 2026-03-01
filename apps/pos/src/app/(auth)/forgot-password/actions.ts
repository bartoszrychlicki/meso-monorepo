'use server';

import { createClient } from '@/lib/supabase/server';

export async function resetPasswordForEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    return { error: 'Nie udalo sie wyslac linku resetujacego. Sprobuj ponownie.' };
  }

  return { success: true };
}
