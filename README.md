# MESO Monorepo

Turborepo monorepo for MESO - a Japanese comfort food franchise. Contains the POS system, online ordering (delivery) app, and shared packages.

## Architecture

```
                 ┌──────────────┐
Delivery ──HTTP──▶  POS API     ├──SQL──▶ Supabase
                 │  /api/v1/*   │        PostgreSQL
POS UI ──────────▶              │
                 └──────────────┘
```

**Core rule:** Only POS API writes to the database. Delivery and future channels (kiosk, mobile) call POS API via `@meso/api-client`. Delivery retains direct Supabase reads (menu, locations, realtime, auth).

## Structure

```
meso-monorepo/
├── apps/
│   ├── pos/             # POS system (Next.js 16) — pos.mesofood.pl
│   └── delivery/        # Online ordering (Next.js 16) — order.mesofood.pl
├── packages/
│   ├── core/            # Shared enums, types, Zod schemas
│   ├── api-client/      # Typed HTTP client for POS API (retry, backoff)
│   └── supabase/        # Shared Supabase client config
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 24.x
- pnpm 9.x

### Install

```bash
pnpm install
```

### Development

```bash
# Both apps
pnpm dev

# Individual apps
pnpm dev:pos        # http://localhost:3000
pnpm dev:delivery   # http://localhost:3003
```

### Build & Test

```bash
pnpm build          # Build all
pnpm test           # Run all tests (Vitest)
pnpm lint           # ESLint
pnpm type-check     # TypeScript check
```

## Environment Variables

Each app has its own `.env.local`. Copy from `.env.example` (if available) or see the app's `CLAUDE.md`.

### `apps/pos`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_DATA_BACKEND` — `"supabase"` (production) or `"localStorage"` (demo)

### `apps/delivery`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `POS_API_URL` — POS base URL (e.g. `https://pos.mesofood.pl`), **without** `/api/v1`
- `POS_API_KEY` — API key for POS REST API
- `P24_*` — Przelewy24 payment gateway config
- `RESEND_API_KEY` — Email delivery

## Shared Packages

### `@meso/core`
Shared enums (`OrderStatus`, `PaymentStatus`, `LoyaltyTier`), TypeScript types (`Order`, `Customer`), and Zod validation schemas (`CreateOrderSchema`, `UpdateOrderStatusSchema`).

### `@meso/api-client`
Typed HTTP client (`MesoClient`) with automatic retry/backoff. Provides `PosApiClient` with `orders` and `customers` resources. Auto-adds `/api/v1` prefix to all requests.

### `@meso/supabase`
Shared Supabase client factory for server-side and client-side usage across both apps.

## Deployment

Both apps deploy to **Vercel** from this monorepo:

| App | Vercel Project | Domain | Root Directory |
|-----|---------------|--------|----------------|
| POS | `meso-pos` | pos.mesofood.pl | `apps/pos` |
| Delivery | `meso-delivery` | order.mesofood.pl | `apps/delivery` |

## E2E Tests

Run from `apps/delivery`:

```bash
cd apps/delivery
pnpm test:e2e:sandbox
```

Sandbox cross-app flow (Delivery -> P24 sandbox -> POS KDS):

```bash
cd apps/delivery
pnpm test:e2e:sandbox:headed
```

Recommended (explicit live targets):

```bash
cd apps/delivery
E2E_DELIVERY_BASE_URL=https://order.mesofood.pl \
E2E_POS_BASE_URL=https://pos.mesofood.pl \
E2E_P24_AUTOMATE=1 \
E2E_P24_REDIRECT_TIMEOUT_MS=120000 \
pnpm test:e2e:sandbox:headed
```

Required env variables for sandbox run:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `E2E_DELIVERY_BASE_URL` (default: `https://order.mesofood.pl`)
- `E2E_POS_BASE_URL` (default: `https://pos.mesofood.pl`)
- `E2E_GATE_PASSWORD` (default: `TuJestMeso2026`)
- `E2E_P24_AUTOMATE=0` (disable heuristic auto-clicks on P24 sandbox page; default is enabled)
- `E2E_P24_REDIRECT_TIMEOUT_MS` (max wait for redirect from P24)

## CI and Release Gates

Workflows:
- `CI PR` — required merge gate (quality + live sandbox E2E)
- `CI Main` — post-merge confidence run (quality + live sandbox E2E)
- `E2E Sandbox` — nightly and manual real payment sandbox flow
- `Release Gate` — manual pre-release validation (quality + optional sandbox E2E)

Detailed strategy and go/no-go checklist:
- [`docs/testing-reliability-strategy.md`](docs/testing-reliability-strategy.md)
