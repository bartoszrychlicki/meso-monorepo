import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_USER = process.env.BASIC_AUTH_USER || 'meso'
const AUTH_PASS = process.env.BASIC_AUTH_PASS || 'likwidacja2026'

export async function proxy(request: NextRequest) {
  const auth = request.headers.get('authorization')

  if (auth) {
    const [scheme, encoded] = auth.split(' ')

    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = atob(encoded)
        const [user, pass] = decoded.split(':')

        if (user === AUTH_USER && pass === AUTH_PASS) {
          return await continueWithSupabase(request)
        }
      } catch {
        // Invalid auth header falls through to the 401 response.
      }
    }
  }

  return new NextResponse('Dostep ograniczony', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="MESO Food"',
    },
  })
}

async function continueWithSupabase(request: NextRequest) {
  // Password gate: DISABLED for now
  // const isPublicPath =
  //   request.nextUrl.pathname === '/gate' ||
  //   request.nextUrl.pathname === '/callback' ||
  //   request.nextUrl.pathname === '/reset-password' ||
  //   request.nextUrl.pathname === '/forgot-password' ||
  //   request.nextUrl.pathname === '/login' ||
  //   request.nextUrl.pathname === '/register' ||
  //   request.nextUrl.pathname.startsWith('/api/gate') ||
  //   request.nextUrl.pathname.startsWith('/api/payments/') ||
  //   request.nextUrl.pathname.startsWith('/_next/') ||
  //   request.nextUrl.pathname.startsWith('/favicon') ||
  //   request.nextUrl.pathname.endsWith('.svg') ||
  //   request.nextUrl.pathname.endsWith('.png') ||
  //   request.nextUrl.pathname.endsWith('.jpg') ||
  //   request.nextUrl.pathname.endsWith('.ico')
  //
  // if (!isPublicPath) {
  //   const accessCookie = request.cookies.get('meso_access')
  //   if (accessCookie?.value !== 'TuJestMeso2026') {
  //     const gateUrl = new URL('/gate', request.url)
  //     return NextResponse.redirect(gateUrl)
  //   }
  // }

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
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
