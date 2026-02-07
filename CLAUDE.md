# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MESOpos is a custom POS (Point of Sale) system for a gastronomy chain operating on a **Central Kitchen (KC) + Mobile Sales Points** model. The full functional specification is in `docs/SPECYFIKACJA_FUNKCJONALNA_POS_KOMPLETNA-2.md` (Polish language).

The system handles: food trucks, small restaurants, kiosks, delivery, pickup, and a customer mobile app. It is **not yet implemented** — this repository currently contains only the specification document.

## Architecture

**Modular Monolith** — designed for a small team (2-5 developers), not microservices.

### Tech Stack (as specified)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript 5+ |
| API | Next.js API Routes + tRPC |
| ORM | Prisma 5+ |
| Validation | Zod |
| Database | Supabase PostgreSQL (with RLS) |
| Auth | Supabase Auth (JWT, OAuth) |
| State | Zustand + TanStack Query |
| UI | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Real-time | Supabase Realtime (WebSockets) |
| Cache | Redis 7+ (Upstash) |
| Task Queue | BullMQ + Redis |
| Hosting | Vercel |
| Storage | Supabase Storage |

### Database Schemas

The PostgreSQL database is organized into separate schemas:
- `menu` — products, categories, modifiers, promotions
- `orders` — orders, items, status history
- `payments` — payments, transactions, refunds
- `inventory` — stock, movements, suppliers, batches
- `users` — users, roles, permissions, locations
- `crm` — customers, loyalty, coupons
- `reports` — reports, metrics, dashboards
- `employees` — employees, work time, schedules

### Modules

| Module | Responsibility |
|--------|---------------|
| MenuModule | Products, categories, pricing, availability, modifiers, promotions |
| OrderModule | Orders, items, statuses, order flow |
| PaymentModule | Payments, transactions, refunds (Stripe integration) |
| KitchenModule | KDS queue, preparation times, kitchen stations |
| InventoryModule | Warehouses, stock levels, batch tracking (FEFO), suppliers, HACCP |
| UserModule | Users, roles, permissions, locations |
| CRMModule | Customers, loyalty program (points/tiers), RFM segmentation, coupons |
| ReportingModule | Dashboards, KPIs, reports (sales, operations, finance, inventory) |
| EmployeeModule | Employees, time tracking (clock-in/out), labor cost calculation |
| IntegrationModule | External APIs, webhooks, API keys |

### Inter-module Communication

- **Synchronous (internal)**: tRPC procedures, Server Actions
- **Asynchronous (external)**: Supabase Realtime, Redis Pub/Sub

## Key Domain Concepts

- **Central Kitchen (KC)**: Produces semi-finished goods, distributes to sales points
- **Sales Points**: Food trucks, kiosks, small restaurants — receive stock from KC
- **FEFO**: First Expired First Out — mandatory for batch tracking and stock issuing
- **BOM (Bill of Materials)**: Nested recipes — finished goods use semi-finished goods which use raw materials
- **14 EU Allergens**: Must be tracked through the recipe chain automatically
- **Order channels**: Delivery, pickup, eat-in (future), own mobile app
- **Order statuses**: pending -> confirmed -> accepted -> preparing -> ready -> out_for_delivery/served -> delivered
- **Loyalty tiers**: Bronze (0-499 pts), Silver (500-1499 pts), Gold (1500+ pts)

## AI-Friendly Design Requirements

All UI must use semantic HTML5 with `data-*` attributes for AI agent navigation:
- `data-action` on buttons (e.g., `data-action="create-order"`)
- `data-field` on form inputs (e.g., `data-field="product-name"`)
- `data-value`, `data-status`, `data-id`, `data-view` on relevant elements
- ARIA labels and roles on all interactive elements
- AI metadata in `<head>` via `<meta name="ai:*">` tags
- Zod schemas should include `.describe()` for AI readability

## API Design

REST API at `/api/v1/` with standard response format:
```json
{
  "success": true|false,
  "data": { ... },
  "meta": { "total": N, "page": N, "per_page": N, "timestamp": "..." },
  "error": { "code": "...", "message": "...", "details": [...] }
}
```

Authentication: JWT (Supabase Auth) + API Key (`X-API-Key` header) for external apps. Webhooks use HMAC signatures (`X-POS-Signature`).

## Implementation Phases

1. **Phase 0** (Weeks 1-2): Project setup, CI/CD, Docker, staging
2. **Phase 1 MVP** (Weeks 3-10): UserModule, MenuModule, OrderModule, KitchenModule, basic InventoryModule, EmployeeModule, Stripe, SMS
3. **Phase 2** (Weeks 11-16): Full InventoryModule, CRMModule, ReportingModule, PWA
4. **Phase 3** (Weeks 17-24): AI features (forecasting, recommendations, sentiment analysis, chatbot)
5. **Phase 4** (Weeks 25-30): Performance, security audit, backups, documentation

## Language

The specification and business domain use Polish language. Code should use English for identifiers, comments, and documentation. User-facing strings will be in Polish.
