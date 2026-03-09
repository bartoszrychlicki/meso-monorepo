import { describe, expect, it } from 'vitest'
import { Tables } from '@/lib/table-mapping'

describe('Tables.customerAddresses', () => {
  it('maps delivery customer addresses to the CRM table in POS schema', () => {
    expect(Tables.customerAddresses).toBe('crm_customer_addresses')
  })
})
