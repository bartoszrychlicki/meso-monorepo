# MESO Monorepo Architecture Design

**Date:** 2026-03-01
**Status:** Approved
**Author:** Architecture session (Bartosz + Claude)

## Problem Statement

Meso-pos (POS system) and Meso-delivery (online ordering frontend) live in separate repos and Vercel projects but share a single Supabase database. Delivery writes directly to the database without communicating with POS, causing:

- **Inconsistent data** — delivery creates orders in a different format (addons vs modifiers, different order number format, no status validation)
- **Missing business validation** — delivery bypasses POS logic (product availability checks, order number generation, loyalty point calculation)
- **Testing difficulty** — business logic is duplicated across two codebases, making integration testing impractical
- **No scalability** — adding new channels (kiosk, mobile, Uber Eats) would multiply the duplication

## Decision: Turborepo Monorepo with POS API Gateway

### Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Delivery    │────▶│  POS API    │────▶│  Supabase    │
│  (frontend)  │HTTP │  /api/v1/*  │ SQL │  PostgreSQL  │
└─────────────┘     └─────────────┘     └──────────────┘
                          ▲
┌─────────────┐           │
│  POS UI     │───────────┘
│  (frontend) │ direct calls (same Next.js app)
└─────────────┘

┌─────────────┐           │
│  Future:    │───────────┘
│  Kiosk/     │HTTP (via @meso/api-client)
│  Mobile/    │
│  Uber Eats  │
└─────────────┘
```

**Core rule:** Only POS API (`apps/pos/src/app/api/v1/`) writes to the database. Delivery and all future channels call POS API via `@meso/api-client`. Delivery retains direct Supabase reads (menu, locations, realtime subscriptions, auth).

## Monorepo Structure

```
meso/
├── apps/
│   ├── pos/                    # Meso-pos (Next.js 16, Vercel)
│   │   ├── src/
│   │   │   ├── app/            # Routes + API endpoints
│   │   │   ├── modules/        # Business modules (unchanged)
│   │   │   ├── components/     # UI components
│   │   │   └── lib/            # Infra (data, sms, webhooks)
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── delivery/               # Meso-delivery (Next.js 16, Vercel)
│       ├── src/
│       │   ├── app/            # Routes + API routes (P24, auth, loyalty)
│       │   ├── components/     # UI components
│       │   ├── hooks/          # React hooks
│       │   └── stores/         # Zustand (cart)
│       ├── package.json
│       └── next.config.ts
│
├── packages/
│   ├── core/                   # Source of truth: types, enums, Zod schemas
│   │   ├── src/
│   │   │   ├── types/          # Order, Product, Customer, Location, ApiResponse
│   │   │   ├── enums/          # OrderStatus, PaymentMethod, Channel, etc.
│   │   │   ├── schemas/        # Zod: CreateOrderSchema, UpdateStatusSchema
│   │   │   ├── constants/      # Status transitions, loyalty tiers, tax rates
│   │   │   └── index.ts
│   │   └── package.json        # "@meso/core", zero runtime deps
│   │
│   ├── api-client/             # Typed HTTP client for POS API
│   │   ├── src/
│   │   │   ├── client.ts       # Base HTTP client (fetch + retry + backoff)
│   │   │   ├── orders.ts       # createOrder(), updateStatus(), getOrder()
│   │   │   ├── menu.ts         # getProducts(), getCategories()
│   │   │   ├── customers.ts    # findByPhone(), create(), activateCoupon()
│   │   │   ├── errors.ts       # Typed API errors
│   │   │   └── index.ts
│   │   └── package.json        # "@meso/api-client", deps: @meso/core
│   │
│   └── supabase/               # Shared Supabase client configuration
│       ├── src/
│       │   ├── client.ts       # createBrowserClient()
│       │   ├── server.ts       # createServerClient()
│       │   ├── middleware.ts    # Auth middleware helpers
│       │   └── index.ts
│       └── package.json        # "@meso/supabase"
│
├── supabase/                   # Single source of migrations
│   ├── migrations/
│   └── config.toml
│
├── turbo.json
├── package.json                # Workspace root
└── pnpm-workspace.yaml
```

### Package Dependency Graph

```
@meso/core          (zero deps)
    ↑
@meso/api-client    (depends on: @meso/core)
    ↑
@meso/supabase      (depends on: @supabase/ssr, @supabase/supabase-js)

apps/pos            (imports: @meso/core, @meso/supabase)
apps/delivery       (imports: @meso/core, @meso/api-client, @meso/supabase)
```

## Data Flow: Order Lifecycle (Online)

```
1. BROWSE MENU
   Delivery → Supabase (direct read)
   ✓ Fast, no POS API load, public data

2. CART + CHECKOUT
   Delivery → Zustand cart store (local)
   ✓ No changes, offline-capable

3. CREATE ORDER
   Delivery → POST /api/v1/orders (POS API via @meso/api-client)
   POS API:
   → Validates schema (Zod from @meso/core)
   → Checks product/variant availability
   → Validates modifiers (existence, group membership)
   → Generates order_number: ZAM-YYYYMMDD-NNN
   → Calculates subtotal, tax, discount, delivery_fee
   → Sets status: "pending" (online) or "confirmed" (pay_on_pickup)
   → INSERTs order + items atomically
   → Returns { order_id, order_number, total, status }

4. PAYMENT (stays in delivery)
   Delivery → POST /api/payments/p24/register (delivery API route)
   → Registers P24 transaction
   → Redirects to P24

5. PAYMENT CALLBACK
   P24 → POST /api/payments/p24/status (delivery API route)
   → Verifies with P24
   → PATCH /api/v1/orders/{id}/status (POS API via @meso/api-client)
     { status: "confirmed", payment_status: "paid" }
   → POS API: validates transition, sends SMS + webhook

6. ORDER TRACKING
   Delivery → Supabase Realtime (direct subscribe)
   ✓ Live updates without polling POS API

7. STATUS UPDATES (by POS/kitchen staff)
   POS UI → PATCH /api/v1/orders/{id}/status
   → confirmed → accepted → preparing → ready → out_for_delivery → delivered
   → Each change: webhook + SMS
   → Delivery receives via Supabase Realtime
```

## Unified Data Format

### OrderItem (source of truth in @meso/core)

Apps are not live yet — no legacy data to migrate. Clean cut to POS format.

```typescript
// packages/core/src/types/order.ts

export interface OrderItemModifier {
  modifier_id: string
  name: string
  price: number
  quantity: number
  modifier_action: ModifierAction  // 'add' | 'remove' | 'substitute' | 'preparation'
}

export interface CreateOrderItem {
  product_id: string
  variant_id?: string
  quantity: number
  modifiers?: OrderItemModifier[]
  notes?: string
}

export interface OrderItem extends CreateOrderItem {
  id: string
  product_name: string     // denormalized by POS API
  variant_name?: string    // denormalized by POS API
  unit_price: number       // set by POS API from pricing table
  subtotal: number         // calculated by POS API
}
```

Delivery UI updates directly to use `modifiers` with `modifier_action` — no mapping layer needed.

## What Delivery Loses (Direct Writes)

| Current delivery operation | Target |
|---|---|
| `supabase.from('orders_orders').insert()` | `POST /api/v1/orders` |
| `supabase.from('orders_order_items').insert()` | Handled by POS API during order creation |
| `supabase.from('crm_customers').update()` | `PUT /api/v1/crm/customers/{id}` |
| `supabase.from('crm_customer_coupons').update()` | `PATCH /api/v1/crm/coupons/{id}` (new endpoint) |
| `supabase.from('orders_orders').update({status})` | `PATCH /api/v1/orders/{id}/status` |

## What Delivery Keeps (Direct Reads)

| Operation | Reason |
|---|---|
| `supabase.from('menu_products').select()` | Fast read, public data |
| `supabase.from('menu_categories').select()` | Same |
| `supabase.from('users_locations').select()` | Location data (hours, fees) |
| `supabase.from('crm_promotions').select()` | Promo code validation (read) |
| `supabase.channel().on('postgres_changes')` | Realtime order tracking |
| `supabase.auth.*` | Customer authentication (separate from POS) |

## RLS Enforcement

To guarantee delivery cannot write:
- Role `anon` (delivery) → `SELECT` only on business tables
- Role `service_role` (POS API) → full access
- Customer JWT (delivery auth) → `SELECT` own orders, `SELECT` menu/locations

## Operator Panel

Moves from delivery to POS:
- `/api/operator/orders` → becomes `/dashboard/online-orders` view in POS
- PIN auth replaced by standard POS authentication (JWT + roles)
- Realtime subscriptions on `channel: 'delivery_app'` orders — visible in KDS and new view

## Payments

P24 integration stays in delivery app:
- P24 requires redirect URLs pointing to delivery domain (order.mesofood.pl)
- POS uses terminal/cash — completely different flow
- Future kiosk will have its own payment flow
- Single touchpoint: after successful payment, delivery calls POS API to update `payment_status: "paid"` and `status: "confirmed"`

## Git & Vercel Strategy

### Git: New monorepo repo + preserve history

1. Create `github.com/bartoszrychlicki/meso` (new repo)
2. Merge both repo histories via `git remote add` + `merge --allow-unrelated-histories`
3. Restructure into `apps/pos/` and `apps/delivery/`
4. Archive old repos (read-only, keep as backup)

### Vercel: Relink existing projects

Relink existing Vercel projects to new monorepo (preserves domains, env vars, analytics, deployment history):

| Setting | apps/pos | apps/delivery |
|---|---|---|
| Root Directory | `apps/pos` | `apps/delivery` |
| Build Command | `cd ../.. && npx turbo run build --filter=pos` | `cd ../.. && npx turbo run build --filter=delivery` |
| Install Command | `cd ../.. && pnpm install` | `cd ../.. && pnpm install` |
| Output Directory | `.next` | `.next` |

Turbo auto-filtering: change in `apps/delivery/` only → only delivery rebuilds. Change in `packages/core/` → both apps rebuild.

## Error Handling & Resilience

### @meso/api-client: Retry with backoff

- **Retry:** timeout, 500, 502, 503 (server temporarily unavailable)
- **Don't retry:** 400 (validation), 401 (auth), 404 (not found), 409 (duplicate — idempotency)
- **Max 2 retries** (3 attempts total), backoff 500ms → 1000ms
- **Timeout 8s** per request

### Idempotency

Delivery generates `external_order_id` (UUID) client-side before sending. POS API checks for duplicates — even if retry sends the same request 3 times, only one order is created.

### P24 Callback Resilience

After returning from P24, delivery polls payment status every 5s for 60s. If callback didn't arrive but P24 confirms payment, delivery manually calls POS API to update status.

### Graceful Degradation (POS API down)

- Menu/browsing: works (Supabase direct read)
- Cart: works (Zustand, offline)
- Placing order: shows error with retry in 30s
- Order status page: works (Supabase Realtime)

Customer only loses ability to place new orders. POS API on Vercel has 99.9%+ uptime.

### Logging (Phase 1 — Launch)

- Structured `console.error()` with context in POS API routes
- Vercel Function Logs for debugging
- User-friendly error messages in delivery UI

### Logging (Phase 2 — Post-launch)

- Sentry for error tracking + alerts
- `system_error_log` table for critical errors
- Uptime monitoring (BetterUptime on POS API health endpoint)

## Migration Phases

| Phase | What | Days |
|---|---|---|
| 0 | Monorepo setup (new repo, merge history, Turborepo, Vercel relink) | 1 |
| 1 | Extract `@meso/core` (types, enums, schemas, constants) | 1-2 |
| 2 | Extract `@meso/supabase` (shared client config) | 2 |
| 3 | Create `@meso/api-client` + extend POS API (new endpoints) | 2-3 |
| 4 | Rewrite delivery writes → POS API (useCheckout, P24 callback, loyalty, operator panel) | 3-4 |
| 5 | RLS lockdown + E2E tests | 4-5 |
| 6 | Cleanup (remove old types, table-mapping, operator panel from delivery) | 5 |

Each phase ends with a green build — can deploy after each phase without regression.
