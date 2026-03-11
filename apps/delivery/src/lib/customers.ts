import { Tables } from '@/lib/table-mapping'

type QueryError = {
  message?: string
} | null

type QueryResult = Promise<{
  data: unknown
  error: QueryError
}>

type SingleRowQuery = {
  eq: (column: string, value: string) => {
    maybeSingle: () => QueryResult
  }
}

type QueryableClient = {
  from: (table: string) => {
    select: (columns: string) => SingleRowQuery
  }
}

export async function fetchCustomerByAuthId<T>(
  client: unknown,
  authUserId: string,
  columns: string
): Promise<T | null> {
  const queryClient = client as QueryableClient

  const { data, error } = await queryClient
    .from(Tables.customers)
    .select(columns)
    .eq('auth_id', authUserId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Nie udało się pobrać profilu klienta')
  }

  return (data as T | null) ?? null
}
