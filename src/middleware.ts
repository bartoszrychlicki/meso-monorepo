import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ALLOWED_ORIGINS = [
  process.env.DELIVERY_APP_URL || 'https://meso-delivery.vercel.app',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-API-Key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/orders',
  '/menu',
  '/recipes',
  '/inventory',
  '/deliveries',
  '/crm',
  '/employees',
  '/settings',
];

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // CORS for API routes — skip auth entirely
  if (pathname.startsWith('/api/v1/')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }
    const response = NextResponse.next();
    const headers = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  // Check if route needs auth handling
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Other routes — pass through without Supabase call
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const { user, supabaseResponse } = await updateSession(request);

  // Protected route + no user → redirect to /login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth route + authenticated user → redirect to /dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
