type QueryError = {
  message?: string
} | null

type QueryableClient = {
  from: (table: string) => any
}

export async function fetchCustomerByAuthId<T>(
  client: QueryableClient,
  authUserId: string,
  columns: string
): Promise<T | null> {
  const { data, error } = await client
    .from('crm_customers')
    .select(columns)
    .eq('auth_id', authUserId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Nie udało się pobrać profilu klienta')
  }

  return (data as T | null) ?? null
}
