import { apiError } from '@/lib/api/response';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { listProductOptions } from '@/modules/crm/server/catalog';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError('UNAUTHORIZED', 'Wymagane zalogowanie użytkownika', 401);
  }

  try {
    const products = await listProductOptions(createServiceClient());
    return Response.json({ data: products });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się pobrać listy produktów';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
