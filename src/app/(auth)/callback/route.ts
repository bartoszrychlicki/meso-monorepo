import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/'

  if (!code) {
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  }

  // Collect cookies set by Supabase during code exchange
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  // Determine redirect destination
  let redirectTo: URL

  if (error) {
    console.error('Auth callback error:', error)
    redirectTo = new URL('/login?error=auth_callback_error', requestUrl.origin)
  } else if (type === 'recovery') {
    redirectTo = new URL('/reset-password?recovery=1', requestUrl.origin)
  } else if (type === 'signup' || type === 'email_change') {
    // No more anonymous conversion — the handle_new_delivery_customer trigger
    // in POS database automatically creates crm_customers record on signup
    redirectTo = new URL('/?welcome=true', requestUrl.origin)
  } else {
    redirectTo = new URL(next, requestUrl.origin)
  }

  // Create redirect response and set all session cookies on it
  const response = NextResponse.redirect(redirectTo)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
