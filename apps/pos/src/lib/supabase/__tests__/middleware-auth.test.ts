import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock the updateSession function from @/lib/supabase/middleware.
// We use vi.hoisted so the mock is available before any module resolution.
// ---------------------------------------------------------------------------
const { mockUpdateSession } = vi.hoisted(() => {
  return { mockUpdateSession: vi.fn() };
});

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}));

// Import the middleware under test. The implementation will be created later
// (TDD — tests first). Once implemented, the middleware at src/middleware.ts
// will import updateSession from @/lib/supabase/middleware and use it for
// auth checks on protected/auth routes while skipping API routes and
// unrelated routes.
import { middleware } from '@/middleware';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(
  pathname: string,
  options?: { method?: string; origin?: string }
) {
  const url = new URL(pathname, 'http://localhost:3000');
  const headers: Record<string, string> = {};
  if (options?.origin) {
    headers.origin = options.origin;
  }
  return new NextRequest(url, {
    method: options?.method || 'GET',
    headers,
  });
}

function mockAuthenticatedUser(metadata?: Record<string, unknown>) {
  const supabaseResponse = NextResponse.next();
  mockUpdateSession.mockResolvedValue({
    user: { id: 'user-123', email: 'test@example.com', user_metadata: metadata },
    supabaseResponse,
  });
  return supabaseResponse;
}

function mockUnauthenticatedUser() {
  const supabaseResponse = NextResponse.next();
  mockUpdateSession.mockResolvedValue({
    user: null,
    supabaseResponse,
  });
  return supabaseResponse;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Middleware auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. API routes — skip auth, add CORS headers
  // -------------------------------------------------------------------------
  describe('API routes', () => {
    it('should NOT check auth for API routes and should add CORS headers', async () => {
      const request = createMockRequest('/api/v1/products', {
        origin: 'https://meso-delivery.vercel.app',
      });

      const response = await middleware(request);

      expect(mockUpdateSession).not.toHaveBeenCalled();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://meso-delivery.vercel.app'
      );
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
        'GET'
      );
    });

    it('should return 204 with CORS headers for OPTIONS preflight to API routes', async () => {
      const request = createMockRequest('/api/v1/products', {
        method: 'OPTIONS',
        origin: 'https://meso-delivery.vercel.app',
      });

      const response = await middleware(request);

      expect(response.status).toBe(204);
      expect(mockUpdateSession).not.toHaveBeenCalled();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://meso-delivery.vercel.app'
      );
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
        'OPTIONS'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'Authorization'
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Protected routes — no user → redirect to /login
  // -------------------------------------------------------------------------
  describe('Protected routes — unauthenticated user', () => {
    it('should redirect /dashboard to /login?redirect=/dashboard when no user', async () => {
      mockUnauthenticatedUser();
      const request = createMockRequest('/dashboard');

      const response = await middleware(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('redirect')).toBe('/dashboard');
    });

    it('should redirect /admin/users to /login?redirect=/admin/users when no user', async () => {
      mockUnauthenticatedUser();
      const request = createMockRequest('/admin/users');

      const response = await middleware(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('redirect')).toBe('/admin/users');
    });

    const protectedRoutes = [
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

    it.each(protectedRoutes)(
      'should redirect %s to /login when no user',
      async (route) => {
        mockUnauthenticatedUser();
        const request = createMockRequest(route);

        const response = await middleware(request);

        expect(response.status).toBe(307);
        const location = new URL(response.headers.get('location')!);
        expect(location.pathname).toBe('/login');
        expect(location.searchParams.get('redirect')).toBe(route);
      }
    );
  });

  // -------------------------------------------------------------------------
  // 3. Protected routes — authenticated user → pass through
  // -------------------------------------------------------------------------
  describe('Protected routes — authenticated user', () => {
    it('should pass through to /dashboard when user is authenticated', async () => {
      const supabaseResponse = mockAuthenticatedUser();
      const request = createMockRequest('/dashboard');

      const response = await middleware(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
      expect(response).toBe(supabaseResponse);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Auth routes — authenticated user → redirect to /dashboard
  // -------------------------------------------------------------------------
  describe('Auth routes — authenticated user', () => {
    it('should redirect /login to /dashboard when user is authenticated', async () => {
      mockAuthenticatedUser();
      const request = createMockRequest('/login');

      const response = await middleware(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/dashboard');
    });

    const authRoutes = ['/login', '/forgot-password', '/reset-password'];

    it.each(authRoutes)(
      'should redirect %s to /dashboard when user is authenticated',
      async (route) => {
        mockAuthenticatedUser();
        const request = createMockRequest(route);

        const response = await middleware(request);

        expect(response.status).toBe(307);
        const location = new URL(response.headers.get('location')!);
        expect(location.pathname).toBe('/dashboard');
      }
    );
  });

  // -------------------------------------------------------------------------
  // 5. Auth routes — no user → pass through
  // -------------------------------------------------------------------------
  describe('Auth routes — unauthenticated user', () => {
    it('should pass through to /login when no user', async () => {
      const supabaseResponse = mockUnauthenticatedUser();
      const request = createMockRequest('/login');

      const response = await middleware(request);

      expect(mockUpdateSession).toHaveBeenCalledWith(request);
      expect(response).toBe(supabaseResponse);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Admin routes — role-based access
  // -------------------------------------------------------------------------
  describe('Admin routes — role-based access', () => {
    it('should allow admin user to access /admin/users', async () => {
      const supabaseResponse = mockAuthenticatedUser({ role: 'admin' });
      const request = createMockRequest('/admin/users');

      const response = await middleware(request);

      expect(response).toBe(supabaseResponse);
    });

    it('should redirect cashier from /admin/users to /dashboard', async () => {
      mockAuthenticatedUser({ role: 'cashier' });
      const request = createMockRequest('/admin/users');

      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/dashboard');
    });

    it('should redirect manager from /admin to /dashboard', async () => {
      mockAuthenticatedUser({ role: 'manager' });
      const request = createMockRequest('/admin');

      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/dashboard');
    });

    it('should redirect user without role metadata from /admin/users to /dashboard', async () => {
      mockAuthenticatedUser();
      const request = createMockRequest('/admin/users');

      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/dashboard');
    });
  });

  // -------------------------------------------------------------------------
  // 7. Other routes — pass through without Supabase call
  // -------------------------------------------------------------------------
  describe('Other routes', () => {
    it('should pass through /kitchen without calling updateSession', async () => {
      const request = createMockRequest('/kitchen');

      const response = await middleware(request);

      expect(mockUpdateSession).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });
});
