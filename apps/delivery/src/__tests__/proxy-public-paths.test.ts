import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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
  createServerClient: vi.fn((_url: string, _key: string, _opts: unknown) => ({
    auth: { getUser: mockGetUser },
  })),
}))

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GATE_PASSWORD = 'TuJestMeso2026'
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

describe('proxy – public paths bypass gate', () => {
  let proxy: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../proxy')
    proxy = mod.proxy
  })

  // ---- Auth paths should be public (no meso_access cookie needed) ----

  const publicAuthPaths = [
    '/callback',
    '/reset-password',
    '/forgot-password',
    '/login',
    '/register',
    '/gate',
  ]

  for (const path of publicAuthPaths) {
    it(`allows ${path} without meso_access cookie`, async () => {
      const req = makeRequest(path)
      const res = await proxy(req)

      expect(isRedirectToGate(res)).toBe(false)
    })
  }

  // ---- API public paths ----

  it('allows /api/gate without meso_access cookie', async () => {
    const req = makeRequest('/api/gate')
    const res = await proxy(req)

    expect(isRedirectToGate(res)).toBe(false)
  })

  it('allows /api/payments/webhook without meso_access cookie', async () => {
    const req = makeRequest('/api/payments/webhook')
    const res = await proxy(req)

    expect(isRedirectToGate(res)).toBe(false)
  })

  // ---- Static asset paths ----

  it('allows static assets (.svg, .png, .jpg, .ico) without cookie', async () => {
    const staticPaths = ['/logo.svg', '/hero.png', '/photo.jpg', '/favicon.ico']

    for (const path of staticPaths) {
      const req = makeRequest(path)
      const res = await proxy(req)
      expect(isRedirectToGate(res)).toBe(false)
    }
  })

  it('allows /_next/ prefixed paths without cookie', async () => {
    const req = makeRequest('/_next/static/chunks/main.js')
    const res = await proxy(req)

    expect(isRedirectToGate(res)).toBe(false)
  })
})

describe('proxy – non-public paths require meso_access cookie', () => {
  let proxy: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../proxy')
    proxy = mod.proxy
  })

  const protectedPaths = ['/menu', '/account', '/cart', '/checkout', '/order/123', '/']

  for (const path of protectedPaths) {
    it(`redirects ${path} to /gate without meso_access cookie`, async () => {
      const req = makeRequest(path)
      const res = await proxy(req)

      expect(isRedirectToGate(res)).toBe(true)
    })
  }

  it('redirects /menu to /gate with wrong meso_access cookie', async () => {
    const req = makeRequest('/menu', { meso_access: 'wrong-password' })
    const res = await proxy(req)

    expect(isRedirectToGate(res)).toBe(true)
  })
})

describe('proxy – non-public paths pass through with valid meso_access cookie', () => {
  let proxy: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../proxy')
    proxy = mod.proxy
  })

  const protectedPaths = ['/menu', '/account', '/cart', '/checkout', '/']

  for (const path of protectedPaths) {
    it(`allows ${path} with valid meso_access cookie`, async () => {
      const req = makeRequest(path, { meso_access: GATE_PASSWORD })
      const res = await proxy(req)

      expect(isRedirectToGate(res)).toBe(false)
    })
  }
})
