import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Env vars (must be set before module import)
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// ---------------------------------------------------------------------------
// Mock: @supabase/ssr
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

// ---------------------------------------------------------------------------
// Mock: NextResponse.next — Next.js 16 requires request.headers to be a
// native Headers instance which fails in vitest/jsdom. We stub .next() to
// return a plain NextResponse so the proxy logic can run.
// ---------------------------------------------------------------------------

vi.spyOn(NextResponse, 'next').mockImplementation(() => new NextResponse(null, { status: 200 }))

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE = 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(path: string, cookies?: Record<string, string>) {
  const url = new URL(path, BASE)
  const headers: Record<string, string> = {}

  if (cookies) {
    headers.cookie = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }

  return new NextRequest(url, { headers })
}

function isRedirectToGate(res: Response): boolean {
  if (res.status !== 307) return false
  const location = res.headers.get('location')
  if (!location) return false
  return new URL(location).pathname === '/gate'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('proxy – password gate is disabled', () => {
  let proxy: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../proxy')
    proxy = mod.proxy
  })

  const allPaths = [
    '/menu',
    '/account',
    '/cart',
    '/checkout',
    '/order/123',
    '/',
    '/callback',
    '/reset-password',
    '/forgot-password',
    '/login',
    '/register',
    '/gate',
    '/api/gate',
    '/api/payments/webhook',
  ]

  for (const path of allPaths) {
    it(`allows ${path} without meso_access cookie (gate disabled)`, async () => {
      const req = makeRequest(path)
      const res = await proxy(req)

      expect(isRedirectToGate(res)).toBe(false)
    })
  }

  it('does not redirect even with wrong meso_access cookie', async () => {
    const req = makeRequest('/menu', { meso_access: 'wrong-password' })
    const res = await proxy(req)

    expect(isRedirectToGate(res)).toBe(false)
  })
})
