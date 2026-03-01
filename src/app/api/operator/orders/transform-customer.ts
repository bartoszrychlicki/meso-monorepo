export interface RawCustomer {
  first_name: string
  last_name: string | null
  phone: string | null
  email?: string | null
}

export interface TransformedCustomer {
  name: string | null
  phone: string | null
  email: string | null
}

export function transformCustomer(
  customer: RawCustomer | null
): TransformedCustomer | null {
  if (!customer) return null
  return {
    name:
      [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
      null,
    phone: customer.phone,
    email: customer.email ?? null,
  }
}
