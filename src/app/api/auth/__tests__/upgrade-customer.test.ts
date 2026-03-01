import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../upgrade-customer/route'

describe('POST /api/auth/upgrade-customer', () => {
  it('returns 200 with trigger deferral message (deprecated endpoint)', async () => {
    const req = new NextRequest('http://localhost/api/auth/upgrade-customer', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.message).toBe('Handled by database trigger')
  })
})
