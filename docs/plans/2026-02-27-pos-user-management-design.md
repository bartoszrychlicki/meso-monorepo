# POS User Management & Authentication — Design

## Context

MESOpos shares a Supabase project with Meso Delivery. Delivery customers use Supabase Auth and are stored in `crm_customers` with `id = auth.users.id`. POS staff currently uses localStorage-based auth with seed data — no real authentication.

We need real auth for POS staff using the same Supabase Auth, differentiated by `user_metadata.user_type`.

## Decisions

- **Auth provider:** Supabase Auth (shared `auth.users` with Delivery)
- **Differentiation:** `user_metadata.user_type = 'staff'` for POS, `'customer'` for Delivery
- **Login method:** Email + password only (PIN removed)
- **Session management:** Cookie-based via `@supabase/ssr`
- **User admin panel:** `/admin/users` — accessible to all logged-in staff (roles later)
- **ID strategy:** `users_users.id = auth.users.id` (same pattern as `crm_customers`)

## Architecture

### Auth Flow

```
Browser                    Next.js Server              Supabase
  │                            │                          │
  ├─ POST /login ────────────► │                          │
  │  (email + password)        ├─ signInWithPassword() ──►│
  │                            │◄── JWT + session ────────┤
  │◄── Set-Cookie (session) ───┤                          │
  │                            │                          │
  ├─ GET /dashboard ──────────►│                          │
  │  (Cookie: session)         ├─ middleware.ts            │
  │                            ├─ getUser() ─────────────►│
  │                            │◄── user + metadata ──────┤
  │                            ├─ user_type == 'staff'?   │
  │                            │  YES → continue          │
  │                            │  NO → redirect /login    │
  │◄── HTML ───────────────────┤                          │
```

### Key Components

- `@supabase/ssr` — cookie-based session management
- `middleware.ts` — auth guard for `/dashboard/*` and `/admin/*`
- Server Actions for all auth operations (login, logout, create user, reset password)
- Service client (secret key) for admin operations (`auth.admin.*`)

## Database Changes

### Migration: Trigger for POS staff

```sql
CREATE OR REPLACE FUNCTION handle_new_pos_staff()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'user_type' = 'staff' THEN
    INSERT INTO users_users (id, email, name, username, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1),
      COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'),
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_pos_staff();
```

### Migration: Cleanup `users_users`

- Remove `pin` column
- Ensure `id` is UUID matching `auth.users.id`
- Add RLS policies for staff self-service

### RLS Policies

- Staff can SELECT all `users_users` records (for user list)
- Staff can UPDATE own record (profile edit, future)
- Admin operations go through service client (bypasses RLS)

## UI Pages

### `/login` (rebuild existing)

- Email + password form
- Server Action `signIn()` → `supabase.auth.signInWithPassword()`
- Success → redirect `/dashboard`
- Error → "Nieprawidlowy email lub haslo"
- Link to `/forgot-password`
- Remove all seed data / localStorage auth logic

### `/forgot-password` (new)

- Email input form
- Server Action → `supabase.auth.resetPasswordForEmail()`
- Success message: "Link do resetu hasla wyslany na email"

### `/reset-password` (new)

- New password + confirmation form
- Handles token from Supabase redirect URL
- Server Action → `supabase.auth.updateUser({ password })`

### `/admin/users` (new)

- Table: name, email, status (active/inactive)
- Actions per user: reset password, toggle active
- "Add user" dialog: name, email, temporary password
- Server Action `createStaffUser()` → `supabase.auth.admin.createUser()` with `user_metadata: { user_type: 'staff', name }`

### Navigation

- Add "Uzytkownicy" link in dashboard sidebar (admin section)

## Files to Create/Modify

### New Files

- `src/lib/supabase/middleware.ts` — Supabase client for middleware
- `src/app/(auth)/login/actions.ts` — signIn, signOut Server Actions
- `src/app/(auth)/forgot-password/page.tsx` — forgot password page
- `src/app/(auth)/reset-password/page.tsx` — reset password page
- `src/app/admin/users/page.tsx` — user management page
- `src/app/admin/users/actions.ts` — createUser, resetPassword, toggleActive
- `src/app/admin/layout.tsx` — admin layout
- `supabase/migrations/XXXXXX_pos_auth_staff_trigger.sql` — trigger migration
- `supabase/migrations/XXXXXX_pos_auth_cleanup.sql` — remove pin, add RLS

### Modified Files

- `src/middleware.ts` — add auth guard logic
- `src/app/(auth)/login/page.tsx` — rebuild with Supabase Auth
- `src/lib/supabase/client.ts` — ensure compatible with `@supabase/ssr`
- `src/lib/supabase/server.ts` — add cookie-aware server client
- `src/modules/users/store.ts` — simplify, remove PIN logic
- Dashboard sidebar — add admin link

### Removed

- All seed data logic from login page
- PIN-related code and types
- localStorage-based auth state

## Out of Scope

- Role-based access control (future)
- Location assignment for staff (future)
- Employee time tracking integration (future)
- OAuth / social login (future)
