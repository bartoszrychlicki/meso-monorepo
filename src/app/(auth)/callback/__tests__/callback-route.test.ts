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

const mockExchangeCodeForSession = vi.fn()
const mockRpc = vi.fn()

/**
 * Captures the `setAll` callback so we can simulate Supabase calling it
 * during exchangeCodeForSession (which is how session cookies get queued).
 */
let cookieSetAll: ((cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void) | null = null

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: { cookies: { setAll: typeof cookieSetAll } }) => {
    cookieSetAll = opts.cookies.setAll
    return {
      auth: { exchangeCodeForSession: mockExchangeCodeForSession },
      rpc: mockRpc,
    }
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCallbackRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/callback')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

/** Simulate Supabase setting session cookies during code exchange */
function simulateSessionCookies() {
  if (cookieSetAll) {
    cookieSetAll([
      { name: 'sb-access-token', value: 'mock-access', options: { path: '/', httpOnly: true } },
      { name: 'sb-refresh-token', value: 'mock-refresh', options: { path: '/', httpOnly: true } },
    ])
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  cookieSetAll = null
})

describe('GET /callback', () => {
  let GET: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('../route')
    GET = mod.GET
  })

  // ---- No code param → redirect to / ----
  it('redirects to / when no code param is provided', async () => {
    const res = await GET(makeCallbackRequest())

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
  })

  // ---- Recovery type → redirect to /reset-password?recovery=1 with cookies ----
  it('redirects to /reset-password?recovery=1 for recovery type with session cookies on response', async () => {
    mockExchangeCodeForSession.mockImplementation(async () => {
      simulateSessionCookies()
      return {
        data: {
          user: { id: 'user-1', email: 'user@test.com', is_anonymous: false },
          session: { access_token: 'mock-access', refresh_token: 'mock-refresh' },
        },
        error: null,
      }
    })

    const res = await GET(makeCallbackRequest({ code: 'recovery-code', type: 'recovery' }))

    // Verify redirect destination
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/reset-password')
    expect(location.searchParams.get('recovery')).toBe('1')

    // CRITICAL: Verify session cookies are set on the redirect response
    const setCookieHeaders = res.headers.getSetCookie()
    expect(setCookieHeaders.some((c: string) => c.includes('sb-access-token=mock-access'))).toBe(true)
    expect(setCookieHeaders.some((c: string) => c.includes('sb-refresh-token=mock-refresh'))).toBe(true)

    // Verify exchangeCodeForSession was called with the code
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('recovery-code')
  })

  // ---- Signup type → redirect to /?welcome=true (no anonymous conversion needed) ----
  it('redirects to /?welcome=true for signup type', async () => {
    const testUser = { id: 'user-2', email: 'newuser@test.com', is_anonymous: false }

    mockExchangeCodeForSession.mockImplementation(async () => {
      simulateSessionCookies()
      return {
        data: {
          user: testUser,
          session: { access_token: 'mock-access', refresh_token: 'mock-refresh' },
        },
        error: null,
      }
    })

    const res = await GET(makeCallbackRequest({ code: 'signup-code', type: 'signup' }))

    // Verify redirect destination
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('welcome')).toBe('true')

    // No convert RPC should be called (anonymous flow removed)
    expect(mockRpc).not.toHaveBeenCalled()

    // Verify cookies are set on the response
    const setCookieHeaders = res.headers.getSetCookie()
    expect(setCookieHeaders.some((c: string) => c.includes('sb-access-token=mock-access'))).toBe(true)
  })

  // ---- Error from exchangeCodeForSession → redirect to /login?error=auth_callback_error ----
  it('redirects to /login?error=auth_callback_error when exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid code', status: 400 },
    })

    const res = await GET(makeCallbackRequest({ code: 'bad-code', type: 'recovery' }))

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('error')).toBe('auth_callback_error')
  })

  // ---- No matching type → redirect to `next` param (default /) ----
  it('redirects to next param when type does not match recovery or signup', async () => {
    mockExchangeCodeForSession.mockImplementation(async () => {
      simulateSessionCookies()
      return {
        data: {
          user: { id: 'user-3', email: 'test@test.com', is_anonymous: false },
          session: {},
        },
        error: null,
      }
    })

    const res = await GET(makeCallbackRequest({ code: 'some-code', type: 'magiclink', next: '/account' }))

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/account')

    // Cookies should still be set
    const setCookieHeaders = res.headers.getSetCookie()
    expect(setCookieHeaders.some((c: string) => c.includes('sb-access-token=mock-access'))).toBe(true)
  })

  it('redirects to / when type is unknown and next is not provided', async () => {
    mockExchangeCodeForSession.mockImplementation(async () => {
      simulateSessionCookies()
      return {
        data: {
          user: { id: 'user-4', email: 'test@test.com', is_anonymous: false },
          session: {},
        },
        error: null,
      }
    })

    const res = await GET(makeCallbackRequest({ code: 'some-code' }))

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
  })

  // ---- CRITICAL: Cookies set on redirect response (not lost) ----
  it('sets all session cookies on the redirect response object (regression test for cookie bug)', async () => {
    mockExchangeCodeForSession.mockImplementation(async () => {
      // Simulate Supabase setting multiple cookies (access, refresh, and others)
      if (cookieSetAll) {
        cookieSetAll([
          { name: 'sb-access-token', value: 'tok-a', options: { path: '/', httpOnly: true, sameSite: 'lax' } },
          { name: 'sb-refresh-token', value: 'tok-r', options: { path: '/', httpOnly: true, sameSite: 'lax' } },
          { name: 'sb-auth-token-code-verifier', value: 'tok-v', options: { path: '/', httpOnly: true } },
        ])
      }
      return {
        data: {
          user: { id: 'user-5', email: 'test@test.com', is_anonymous: false },
          session: {},
        },
        error: null,
      }
    })

    const res = await GET(makeCallbackRequest({ code: 'valid-code', type: 'recovery' }))

    const setCookieHeaders = res.headers.getSetCookie()

    // All three cookies must be present on the response
    expect(setCookieHeaders.some((c: string) => c.includes('sb-access-token=tok-a'))).toBe(true)
    expect(setCookieHeaders.some((c: string) => c.includes('sb-refresh-token=tok-r'))).toBe(true)
    expect(setCookieHeaders.some((c: string) => c.includes('sb-auth-token-code-verifier=tok-v'))).toBe(true)

    // Verify cookie attributes are propagated (httpOnly, path)
    const accessCookie = setCookieHeaders.find((c: string) => c.includes('sb-access-token=tok-a'))
    expect(accessCookie).toBeDefined()
    expect(accessCookie!.toLowerCase()).toContain('path=/')
  })

  // ---- Signup always redirects to /?welcome=true (no anonymous distinction) ----
  it('redirects to /?welcome=true even for anonymous-flagged users (anonymous flow removed)', async () => {
    mockExchangeCodeForSession.mockImplementation(async () => {
      simulateSessionCookies()
      return {
        data: {
          user: { id: 'user-anon', email: 'anon@test.com', is_anonymous: true },
          session: {},
        },
        error: null,
      }
    })

    const res = await GET(makeCallbackRequest({ code: 'signup-code', type: 'signup' }))

    // All signups redirect to /?welcome=true (anonymous flow removed)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('welcome')).toBe('true')

    // No RPC calls
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // ---- Convert RPC failure is handled gracefully ----
  it('still redirects successfully if convert_anonymous_to_permanent RPC throws', async () => {
    mockExchangeCodeForSession.mockImplementation(async () => {
      simulateSessionCookies()
      return {
        data: {
          user: { id: 'user-6', email: 'user6@test.com', is_anonymous: false },
          session: {},
        },
        error: null,
      }
    })
    mockRpc.mockRejectedValue(new Error('RPC timeout'))

    const res = await GET(makeCallbackRequest({ code: 'signup-code', type: 'signup' }))

    // Should still redirect to /?welcome=true despite RPC failure
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('welcome')).toBe('true')

    // Cookies should still be present
    const setCookieHeaders = res.headers.getSetCookie()
    expect(setCookieHeaders.some((c: string) => c.includes('sb-access-token=mock-access'))).toBe(true)
  })
})
