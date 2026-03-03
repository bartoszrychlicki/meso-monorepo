import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createBrowserClientMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: createBrowserClientMock,
}))

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ORIGINAL_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ORIGINAL_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function clearSupabaseEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
}

describe('supabase browser client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    clearSupabaseEnv()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    if (ORIGINAL_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL
    }

    if (ORIGINAL_ANON_KEY === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_ANON_KEY
    }

    if (ORIGINAL_PUBLISHABLE_KEY === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = ORIGINAL_PUBLISHABLE_KEY
    }
  })

  it('returns guarded proxy on server when env vars are missing', async () => {
    const { createClient } = await import('../client')

    const client = createClient()

    expect(createBrowserClientMock).not.toHaveBeenCalled()
    expect(() => (client as { auth: unknown }).auth).toThrow(
      /Supabase browser client is unavailable on server/
    )
  })

  it('throws in browser when env vars are missing', async () => {
    vi.stubGlobal('window', {} as Window)
    const { createClient } = await import('../client')

    expect(() => createClient()).toThrow(/Missing required environment variables/)
    expect(createBrowserClientMock).not.toHaveBeenCalled()
  })

  it('creates browser client when env vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    vi.stubGlobal('window', {} as Window)

    const fakeClient = { auth: { getSession: vi.fn() } }
    createBrowserClientMock.mockReturnValue(fakeClient)

    const { createClient } = await import('../client')
    const client = createClient()

    expect(client).toBe(fakeClient)
    expect(createBrowserClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          lock: expect.any(Function),
        }),
      })
    )
  })
})
