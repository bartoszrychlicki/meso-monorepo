# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MESOpos is a POS system for a Japanese comfort food franchise operating a **Central Kitchen (KC) + Mobile Sales Points** model (food trucks, kiosks, small restaurants). The full functional spec is in `docs/SPECYFIKACJA_FUNKCJONALNA_POS_KOMPLETNA-2.md` (Polish).

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build — run before reporting completion
npm run lint         # ESLint (flat config v9)
npm run test         # Vitest — all tests
npm run test:watch   # Vitest — watch mode
npx vitest run src/path/to/file.test.ts  # Single test file
tsc --noEmit         # Type-check only
```

### Supabase (remote only — no Docker)
```bash
npx supabase migration list --project-ref gyxcdrcdnnzjdmcrwbpr
npx supabase db push --project-ref gyxcdrcdnnzjdmcrwbpr
```
Commands requiring Docker (`supabase start`, `db dump`, `db reset`) will fail.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 (strict) |
| Database | Supabase PostgreSQL (RLS) — direct queries, no ORM |
| Auth | Supabase Auth (JWT + API Key) |
| Validation | Zod 4 |
| State | Zustand 5 + TanStack React Query 5 |
| UI | Tailwind CSS 4 + shadcn/ui (New York style) + Radix UI |
| Forms | React Hook Form 7 + Zod resolvers |
| Testing | Vitest 3 + Testing Library (jsdom) |
| Hosting | Vercel |

## Architecture

**Modular Monolith** — each business domain is a self-contained module in `src/modules/`:

```
src/
├── app/                    # Routes (App Router) + REST API
│   ├── (auth)/             # Login, password reset (public)
│   ├── (dashboard)/        # Protected POS views
│   ├── admin/users/        # Admin-only user management
│   └── api/v1/             # REST endpoints
├── modules/                # Business domain modules
│   ├── menu/               # Products, categories, modifiers, pricing
│   ├── orders/             # Cart, order lifecycle, status transitions
│   ├── kitchen/            # KDS queue, cooking timers
│   ├── inventory/          # Warehouses, FEFO batches, stock movements
│   ├── crm/                # Customers, loyalty points/tiers
│   ├── recipes/            # BOM, ingredients, food cost calc
│   ├── deliveries/         # Delivery tracking, fuzzy address matching
│   ├── employees/          # Staff, time tracking
│   ├── users/              # Auth, roles, permissions
│   └── settings/
├── components/ui/          # shadcn/ui primitives (34 components)
├── lib/
│   ├── data/               # Repository factory (localStorage ↔ Supabase)
│   ├── supabase/           # Client, server, middleware, storage helpers
│   ├── api/                # Auth validation, response helpers, API keys
│   └── sms/                # SMS provider + templates
├── schemas/                # Zod validation schemas (all inputs)
├── types/                  # TypeScript interfaces + enums (40+ enums)
└── seed/                   # Dev seed data with fixed UUIDs
```

### Module Convention

Each module follows:
```
modules/{feature}/
├── components/       # React components
│   └── __tests__/
├── repository.ts     # Data access via createRepository<T>()
├── store.ts          # Zustand store
├── hooks.ts          # Custom hooks
└── utils/            # Business logic
```

### Data Backend

Runtime-switchable via `NEXT_PUBLIC_DATA_BACKEND` (`"localStorage"` | `"supabase"`). The `createRepository<T>(tableName)` factory in `lib/data/repository-factory.ts` returns the correct backend. All repos expose: `findAll`, `findById`, `findMany`, `create`, `update`, `delete`, `count`.

### Auth & Middleware

`src/middleware.ts`:
- CORS for `/api/v1/` (whitelists delivery app)
- Protected routes → redirect to `/login` if no session
- Admin routes → redirect non-admins to `/dashboard`
- API auth: Supabase JWT (cookies) + `X-API-Key` header for external apps
- Webhooks: HMAC signatures via `X-POS-Signature`

### API Response Envelope

All `/api/v1/` endpoints:
```json
{ "success": true, "data": {}, "meta": { "total": 0, "page": 1, "per_page": 20, "timestamp": "..." }, "error": null }
```

### Database

PostgreSQL schemas: `menu`, `orders`, `payments`, `inventory`, `users`, `crm`, `reports`, `employees`, `recipes`, `integrations`. Migrations in `supabase/migrations/`. Table names use `{schema}_{table}` convention (e.g., `menu_products`, `orders_orders`).

### Path Alias

`@/*` → `./src/*`

## Key Domain Concepts

- **Central Kitchen (KC)**: Produces semi-finished goods for distribution to sales points
- **FEFO**: First Expired First Out — mandatory for batch inventory
- **BOM**: Nested recipes (finished → semi-finished → raw materials)
- **14 EU Allergens**: Tracked through the recipe chain
- **Order flow**: pending → confirmed → accepted → preparing → ready → out_for_delivery → delivered
- **Loyalty**: Bronze (0-499), Silver (500-1499), Gold (1500+) — 1 PLN = 1 point

## Environment Setup

Copy `env.example` → `.env.local`:
- `NEXT_PUBLIC_DATA_BACKEND=localStorage` for dev without Supabase
- `NEXT_PUBLIC_DATA_BACKEND=supabase` for production

## AI-Friendly UI

Interactive elements use `data-*` attributes (`data-action`, `data-field`, `data-value`, `data-status`, `data-id`, `data-view`). Zod schemas use `.describe()`.

## Language

Code in English. Specs and UI strings in Polish.
