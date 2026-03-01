import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ACCESS_PASSWORD = 'TuJestMeso2026'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Password gate: skip for gate page, webhook endpoints, auth flows, and static assets
  const isPublicPath =
    pathname === '/gate' ||
    pathname === '/callback' ||
    pathname === '/reset-password' ||
    pathname === '/forgot-password' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/api/gate') ||
    pathname.startsWith('/api/payments/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico')

  if (!isPublicPath) {
    const accessCookie = request.cookies.get('meso_access')
    if (accessCookie?.value !== ACCESS_PASSWORD) {
      const gateUrl = new URL('/gate', request.url)
      return NextResponse.redirect(gateUrl)
    }
  }

  // Original Supabase session refresh logic
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Support both variable names for flexibility
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
