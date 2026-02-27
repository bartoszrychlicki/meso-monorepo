# POS User Management & Authentication — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace localStorage-based prototype auth with real Supabase Auth for POS staff, add middleware route protection, and build an admin panel for user management.

**Architecture:** Supabase Auth with `@supabase/ssr` cookie-based sessions. POS staff and Delivery customers share `auth.users` differentiated by `raw_user_meta_data.app_role` ('staff' vs 'customer'). Server Actions handle all auth operations. Middleware protects dashboard/admin routes.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (`@supabase/ssr` 0.8+), Server Actions, Zustand, shadcn/ui, Zod

**Important context:**
- Delivery trigger (`handle_new_delivery_customer`) uses `raw_user_meta_data->>'app_role'` with value `'customer'` — staff trigger must use `app_role = 'staff'` for consistency
- `users_users.id` will equal `auth.users.id` (same pattern as `crm_customers`)
- Existing RLS is permissive allow-all (`USING (true)`) — we keep this for now
- Project ref: `gyxcdrcdnnzjdmcrwbpr` — use `npx supabase db push` (no Docker)
- `NEXT_PUBLIC_DATA_BACKEND` env var controls localStorage vs Supabase backend

---

## Task 1: Database Migration — Staff Trigger + Cleanup

**Files:**
- Create: `supabase/migrations/20260228000011_pos_auth_staff_trigger.sql`

**Step 1: Write the migration file**

```sql
-- ============================================================================
-- Migration: POS Auth — Staff trigger + cleanup
--
-- 1. Drop PIN column from users_users (no longer needed)
-- 2. Create trigger function handle_new_pos_staff() that auto-creates
--    users_users record when a new auth.users row has app_role='staff'
-- 3. Attach trigger to auth.users INSERT
-- ============================================================================

-- 1. Drop PIN column
ALTER TABLE public.users_users DROP COLUMN IF EXISTS pin;

-- 2. Create trigger function for POS staff
CREATE OR REPLACE FUNCTION handle_new_pos_staff()
RETURNS TRIGGER AS $$
BEGIN
    -- Only handle staff users, not delivery customers
    IF (NEW.raw_user_meta_data ->> 'app_role') IS DISTINCT FROM 'staff' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.users_users (id, email, name, username, role, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
        split_part(COALESCE(NEW.email, ''), '@', 1),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'cashier'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists (e.g. re-creation attempt)
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_pos_staff failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created_staff
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_pos_staff();
```

**Step 2: Push migration to remote Supabase**

Run: `npx supabase db push --project-ref gyxcdrcdnnzjdmcrwbpr`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260228000011_pos_auth_staff_trigger.sql
git commit -m "feat(auth): add POS staff trigger + drop PIN column"
```

---

## Task 2: Update Types & Schemas — Remove PIN, Add Auth Types

**Files:**
- Modify: `src/types/user.ts`
- Modify: `src/schemas/user.ts`
- Modify: `src/seed/data/users.ts`

**Step 1: Update User type — remove pin**

In `src/types/user.ts`, remove the `pin` field and add auth-related fields:

```typescript
import { UserRole } from './enums';
import { BaseEntity } from './common';

export interface User extends BaseEntity {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  location_id: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
```

**Step 2: Update Zod schemas — remove PinLoginSchema, add auth schemas**

Replace `src/schemas/user.ts` entirely:

```typescript
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Nieprawidlowy adres email'),
  password: z.string().min(1, 'Haslo jest wymagane'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Nieprawidlowy adres email'),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Haslo musi miec co najmniej 8 znakow'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasla nie sa identyczne',
  path: ['confirmPassword'],
});

export const CreateStaffUserSchema = z.object({
  name: z.string().min(1, 'Imie i nazwisko jest wymagane'),
  email: z.string().email('Nieprawidlowy adres email'),
  password: z.string().min(8, 'Haslo musi miec co najmniej 8 znakow'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type CreateStaffUserInput = z.infer<typeof CreateStaffUserSchema>;
```

**Step 3: Update seed data — remove pin field**

In `src/seed/data/users.ts`, remove all `pin` fields from the seed user objects. Each user entry should no longer contain `pin: '1234'` etc.

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors (some files may still reference old types — we'll fix in subsequent tasks)

**Step 5: Commit**

```bash
git add src/types/user.ts src/schemas/user.ts src/seed/data/users.ts
git commit -m "feat(auth): update types and schemas for Supabase Auth"
```

---

## Task 3: Supabase Middleware Client + Auth Guard

**Files:**
- Create: `src/lib/supabase/middleware.ts`
- Modify: `src/middleware.ts`

**Step 1: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse };
}
```

**Step 2: Update middleware.ts with auth guard**

Replace `src/middleware.ts` entirely:

```typescript
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
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/orders', '/menu', '/recipes', '/inventory', '/deliveries', '/crm', '/employees', '/settings'];
// Routes only for unauthenticated users
const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // --- CORS for API routes ---
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
      if (value) response.headers.set(key, value);
    }
    return response;
  }

  // --- Auth guard for app routes ---
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const { user, supabaseResponse } = await updateSession(request);

  // Unauthenticated user trying to access protected route → redirect to login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access auth route → redirect to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/supabase/middleware.ts src/middleware.ts
git commit -m "feat(auth): add Supabase middleware + auth guard for routes"
```

---

## Task 4: Login Server Actions + Rebuild Login Page

**Files:**
- Create: `src/app/(auth)/login/actions.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/modules/users/components/login-form.tsx`

**Step 1: Create login Server Actions**

Create `src/app/(auth)/login/actions.ts`:

```typescript
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirect') as string | null;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Nieprawidlowy email lub haslo' };
  }

  redirect(redirectTo || '/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

**Step 2: Rebuild login-form.tsx**

Replace `src/modules/users/components/login-form.tsx` entirely:

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginSchema, type LoginInput } from '@/schemas/user';
import { signIn } from '@/app/(auth)/login/actions';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = async (data: LoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('email', data.email);
      formData.set('password', data.password);
      if (redirectTo) formData.set('redirect', redirectTo);

      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect throws — this is expected on success
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4"
      data-component="login-form"
    >
      {error && (
        <Alert variant="destructive" data-status="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="jan.kowalski@mesopos.pl"
          {...form.register('email')}
          data-field="email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Haslo</Label>
        <Input
          id="password"
          type="password"
          placeholder="Wprowadz haslo"
          {...form.register('password')}
          data-field="password"
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        data-action="login-email"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Zaloguj sie
      </Button>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-action="forgot-password"
        >
          Nie pamietasz hasla?
        </Link>
      </div>
    </form>
  );
}
```

**Step 3: Rebuild login page.tsx**

Replace `src/app/(auth)/login/page.tsx`:

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/modules/users/components/login-form';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;

  return (
    <div className="space-y-4" data-page="login">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl shadow-lg">
            M
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">MESOpos</CardTitle>
          <CardDescription className="text-base">
            System zarzadzania punktem sprzedazy
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <LoginForm redirectTo={redirect} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/(auth)/login/actions.ts src/app/(auth)/login/page.tsx src/modules/users/components/login-form.tsx
git commit -m "feat(auth): rebuild login page with Supabase Auth"
```

---

## Task 5: Forgot Password + Reset Password Pages

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/forgot-password/actions.ts`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/(auth)/reset-password/actions.ts`

**Step 1: Create forgot-password Server Action**

Create `src/app/(auth)/forgot-password/actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function resetPasswordForEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    return { error: 'Nie udalo sie wyslac linku resetujacego. Sprobuj ponownie.' };
  }

  return { success: true };
}
```

**Step 2: Create forgot-password page**

Create `src/app/(auth)/forgot-password/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/user';
import { resetPasswordForEmail } from './actions';
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('email', data.email);
      const result = await resetPasswordForEmail(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Wystapil blad. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" data-page="forgot-password">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Resetowanie hasla
          </CardTitle>
          <CardDescription className="text-base">
            Podaj adres email powiazany z Twoim kontem
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {success ? (
            <div className="space-y-4">
              <Alert data-status="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Link do resetowania hasla zostal wyslany na podany adres email.
                  Sprawdz skrzynke pocztowa.
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Powrot do logowania
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-status="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jan.kowalski@mesopos.pl"
                  {...form.register('email')}
                  data-field="email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-action="reset-password"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Wyslij link resetujacy
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Powrot do logowania
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create reset-password Server Action**

Create `src/app/(auth)/reset-password/actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: 'Nie udalo sie zaktualizowac hasla. Sprobuj ponownie.' };
  }

  return { success: true };
}
```

**Step 4: Create reset-password page**

Create `src/app/(auth)/reset-password/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResetPasswordSchema, type ResetPasswordInput } from '@/schemas/user';
import { updatePassword } from './actions';
import { Loader2, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSubmit = async (data: ResetPasswordInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('password', data.password);
      const result = await updatePassword(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Wystapil blad. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" data-page="reset-password">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Ustaw nowe haslo
          </CardTitle>
          <CardDescription className="text-base">
            Wprowadz nowe haslo do swojego konta
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {success ? (
            <div className="space-y-4">
              <Alert data-status="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Haslo zostalo zmienione. Mozesz sie teraz zalogowac.
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                >
                  Przejdz do logowania
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-status="error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Nowe haslo</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 znakow"
                  {...form.register('password')}
                  data-field="password"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdz haslo</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtorz haslo"
                  {...form.register('confirmPassword')}
                  data-field="confirm-password"
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-action="update-password"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Ustaw nowe haslo
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/(auth)/forgot-password/ src/app/(auth)/reset-password/
git commit -m "feat(auth): add forgot-password and reset-password pages"
```

---

## Task 6: Simplify User Store + Update Header with Logout

**Files:**
- Modify: `src/modules/users/store.ts`
- Modify: `src/modules/users/repository.ts`
- Modify: `src/components/layout/header.tsx`

**Step 1: Simplify user store — remove PIN, add Supabase-aware methods**

Replace `src/modules/users/store.ts`:

```typescript
'use client';

import { create } from 'zustand';
import { User } from '@/types/user';
import { Location } from '@/types/common';
import { createClient } from '@/lib/supabase/client';

interface UserStore {
  currentUser: User | null;
  currentLocation: Location | null;
  locations: Location[];
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  loadUser: () => Promise<void>;
  setCurrentLocation: (locationId: string) => void;
  reset: () => void;
}

export const useUserStore = create<UserStore>()((set, get) => ({
  currentUser: null,
  currentLocation: null,
  locations: [],
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      set({ currentUser: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Fetch staff profile from users_users
    const { data: staffUser } = await supabase
      .from('users_users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!staffUser) {
      set({ currentUser: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Fetch location if assigned
    let location: Location | null = null;
    if (staffUser.location_id) {
      const { data: loc } = await supabase
        .from('users_locations')
        .select('*')
        .eq('id', staffUser.location_id)
        .single();
      location = loc;
    }

    // Fetch all locations
    const { data: locations } = await supabase
      .from('users_locations')
      .select('*')
      .eq('is_active', true);

    set({
      currentUser: staffUser as User,
      currentLocation: location,
      locations: (locations || []) as Location[],
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setCurrentLocation: (locationId: string) => {
    const { locations } = get();
    const location = locations.find((l) => l.id === locationId) ?? null;
    set({ currentLocation: location });
  },

  reset: () => {
    set({
      currentUser: null,
      currentLocation: null,
      locations: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
```

**Step 2: Update header with real logout and user data**

Replace `src/components/layout/header.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { LogOut, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from './breadcrumbs';
import { useUserStore } from '@/modules/users/store';
import { signOut } from '@/app/(auth)/login/actions';

export function Header() {
  const { currentUser, currentLocation, locations, setCurrentLocation, loadUser, isLoading } =
    useUserStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <header
      className="flex h-14 items-center gap-4 border-b bg-background px-4"
      data-component="header"
    >
      <SidebarTrigger className="-ml-1" data-action="toggle-sidebar" />
      <Separator orientation="vertical" className="h-6" />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-action="select-location"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {currentLocation?.name || 'Wybierz lokalizacje'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {locations.map((loc) => (
              <DropdownMenuItem
                key={loc.id}
                data-id={loc.id}
                onClick={() => setCurrentLocation(loc.id)}
              >
                {loc.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {!isLoading && currentUser && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium hidden sm:inline">
              {currentUser.name}
            </span>
            <Badge variant="secondary" className="text-xs capitalize">
              {currentUser.role}
            </Badge>
          </div>
        )}
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-action="logout"
            aria-label="Wyloguj sie"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
```

**Step 3: Simplify user repository**

Replace `src/modules/users/repository.ts`:

```typescript
import { User } from '@/types/user';
import { createRepository } from '@/lib/data/repository-factory';

const repo = createRepository<User>('users');

export const usersRepository = {
  ...repo,

  async findByEmail(email: string): Promise<User | null> {
    const users = await repo.findMany((u) => u.email === email && u.is_active);
    return users[0] ?? null;
  },
};
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/modules/users/store.ts src/modules/users/repository.ts src/components/layout/header.tsx
git commit -m "feat(auth): simplify user store + real logout in header"
```

---

## Task 7: Admin User Management — Server Actions

**Files:**
- Create: `src/app/admin/users/actions.ts`

**Step 1: Create admin Server Actions**

Create `src/app/admin/users/actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function getStaffUsers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: data || [] };
}

export async function createStaffUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const serviceClient = createServiceClient();

  const { error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      name,
      role: 'cashier',
    },
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      return { error: 'Uzytkownik z tym adresem email juz istnieje.' };
    }
    return { error: `Nie udalo sie utworzyc uzytkownika: ${error.message}` };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

export async function resetStaffPassword(userId: string) {
  const serviceClient = createServiceClient();

  // Get user email first
  const { data: userData, error: getUserError } =
    await serviceClient.auth.admin.getUserById(userId);

  if (getUserError || !userData.user?.email) {
    return { error: 'Nie znaleziono uzytkownika.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    userData.user.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    }
  );

  if (error) {
    return { error: 'Nie udalo sie wyslac linku resetujacego.' };
  }

  return { success: true };
}

export async function toggleStaffActive(userId: string, isActive: boolean) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('users_users')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return { error: 'Nie udalo sie zmienic statusu uzytkownika.' };
  }

  revalidatePath('/admin/users');
  return { success: true };
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/admin/users/actions.ts
git commit -m "feat(auth): add admin Server Actions for user management"
```

---

## Task 8: Admin User Management — Page UI

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/users/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Create admin layout**

Create `src/app/admin/layout.tsx`:

```typescript
'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { BreadcrumbProvider } from '@/components/layout/breadcrumb-context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
```

**Step 2: Create admin users page**

Create `src/app/admin/users/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateStaffUserSchema, type CreateStaffUserInput } from '@/schemas/user';
import {
  getStaffUsers,
  createStaffUser,
  resetStaffPassword,
  toggleStaffActive,
} from './actions';
import {
  Plus,
  Loader2,
  KeyRound,
  UserX,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const form = useForm<CreateStaffUserInput>({
    resolver: zodResolver(CreateStaffUserSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const loadUsers = async () => {
    setIsLoading(true);
    const result = await getStaffUsers();
    if (result.data) {
      setUsers(result.data as StaffUser[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (data: CreateStaffUserInput) => {
    setCreateError(null);
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.set('name', data.name);
      formData.set('email', data.email);
      formData.set('password', data.password);
      const result = await createStaffUser(formData);
      if (result.error) {
        setCreateError(result.error);
      } else {
        toast.success('Uzytkownik zostal utworzony');
        setDialogOpen(false);
        form.reset();
        await loadUsers();
      }
    } catch {
      setCreateError('Wystapil blad. Sprobuj ponownie.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const result = await resetStaffPassword(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Link do resetu hasla wyslany do ${userName}`);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const result = await toggleStaffActive(userId, isActive);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isActive ? 'Uzytkownik dezaktywowany' : 'Uzytkownik aktywowany');
      await loadUsers();
    }
  };

  return (
    <div className="space-y-6" data-page="admin-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uzytkownicy</h1>
          <p className="text-muted-foreground">
            Zarzadzaj uzytkownikami systemu POS
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-action="add-user">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj uzytkownika
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowy uzytkownik</DialogTitle>
              <DialogDescription>
                Utworz nowe konto dla pracownika POS
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(handleCreateUser)}
              className="space-y-4"
            >
              {createError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Imie i nazwisko</Label>
                <Input
                  id="name"
                  placeholder="Jan Kowalski"
                  {...form.register('name')}
                  data-field="name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jan@mesopos.pl"
                  {...form.register('email')}
                  data-field="email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Haslo tymczasowe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 znakow"
                  {...form.register('password')}
                  data-field="password"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating}
                data-action="create-user"
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Utworz uzytkownika
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista uzytkownikow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Brak uzytkownikow. Dodaj pierwszego uzytkownika.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imie i nazwisko</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-id={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Aktywny
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Nieaktywny</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.id, user.name)}
                          data-action="reset-password"
                          data-id={user.id}
                        >
                          <KeyRound className="mr-1 h-3 w-3" />
                          Reset hasla
                        </Button>
                        <Button
                          variant={user.is_active ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          data-action="toggle-active"
                          data-id={user.id}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="mr-1 h-3 w-3" />
                              Dezaktywuj
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-3 w-3" />
                              Aktywuj
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Add "Uzytkownicy" link to sidebar**

In `src/components/layout/app-sidebar.tsx`, add to the `secondaryNavItems` array (before "Ustawienia") and add `Shield` to the icon imports:

Add `Shield` to the lucide-react import and to `iconMap`. Then change `secondaryNavItems` to:

```typescript
const secondaryNavItems = [
  { title: 'Uzytkownicy', href: '/admin/users', icon: 'Shield' },
  { title: 'Ustawienia', href: '/settings', icon: 'Settings' },
];
```

And add to iconMap:

```typescript
import { Shield } from 'lucide-react';
// Add Shield to the iconMap object
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/users/page.tsx src/components/layout/app-sidebar.tsx
git commit -m "feat(auth): add admin users page + sidebar link"
```

---

## Task 9: Cleanup — Remove Old Auth Code

**Files:**
- Modify: `src/seed/data/users.ts` — remove PIN references
- Verify: `src/seed/index.ts` — still works for localStorage backend
- Remove references: any remaining `loginWithPin` or `PinLoginSchema` imports

**Step 1: Search for remaining PIN references**

Run: `grep -rn "pin\|PIN\|loginWithPin\|PinLogin" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."`

Fix any remaining references found.

**Step 2: Verify full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run existing tests**

Run: `npm test`
Expected: All existing tests pass (some may need minor updates if they reference PIN)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(auth): cleanup old PIN/localStorage auth references"
```

---

## Task 10: Supabase Auth Callback Route

**Files:**
- Create: `src/app/(auth)/auth/callback/route.ts`

Supabase password reset sends users to a callback URL that exchanges a code for a session. This route handles that exchange.

**Step 1: Create the callback route**

Create `src/app/(auth)/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login`);
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(auth)/auth/callback/route.ts
git commit -m "feat(auth): add Supabase auth callback route for password reset"
```

---

## Task 11: Create First Admin User via Supabase

This is a manual/scripted step to create the first POS admin user in Supabase Auth so you can actually log in.

**Step 1: Create a one-time script**

Create `scripts/create-admin.ts` (not part of the app, just a helper):

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@mesopos.pl',
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: {
      app_role: 'staff',
      name: 'Administrator',
      role: 'admin',
    },
  });

  if (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }

  console.log('Admin user created:', data.user?.id);
  console.log('Email: admin@mesopos.pl');
  console.log('Password: Admin123!');
  console.log('\nThe trigger should have auto-created a users_users record.');
}

createAdmin();
```

**Step 2: Run the script**

Run: `npx tsx scripts/create-admin.ts`
Expected: "Admin user created: <uuid>"

**Step 3: Verify trigger worked**

Go to Supabase Dashboard → Table Editor → `users_users` and verify a new row was created with the admin's auth UUID.

**Step 4: Test login**

Run the app (`npm run dev`) and navigate to `/login`. Enter `admin@mesopos.pl` / `Admin123!`. Should redirect to `/dashboard`.

**Step 5: Commit**

```bash
git add scripts/create-admin.ts
git commit -m "chore(auth): add admin user creation script"
```

---

## Task 12: Final Verification + Build

**Step 1: Run full build**

Run: `npm run build`
Expected: Build passes

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Manual smoke test checklist**

1. `/login` — shows email+password form, no PIN mode
2. Login with admin credentials → redirects to `/dashboard`
3. Header shows user name + role + real logout button
4. Logout → redirects to `/login`
5. `/forgot-password` — sends reset email
6. `/admin/users` — shows user list
7. `/admin/users` "Dodaj" — creates new user
8. Unauthenticated access to `/dashboard` → redirects to `/login`
9. Authenticated access to `/login` → redirects to `/dashboard`

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "feat(auth): POS user management and authentication complete"
```
