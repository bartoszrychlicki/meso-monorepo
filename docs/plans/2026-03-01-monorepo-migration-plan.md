# MESO Monorepo Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate two separate repos (Meso-pos, Meso-delivery) into a Turborepo monorepo with shared packages, making POS API the single write gateway.

**Architecture:** Monorepo with `apps/pos`, `apps/delivery`, and `packages/core`, `packages/api-client`, `packages/supabase`. Delivery stops writing to Supabase directly — all mutations go through POS REST API via a typed client. Delivery keeps direct reads (menu, realtime, auth).

**Tech Stack:** Turborepo, pnpm workspaces, Next.js 16, TypeScript 5.9, Zod 4, Supabase, Vitest

**Design doc:** `docs/plans/2026-03-01-monorepo-architecture-design.md`

---

## Task 1: Initialize Monorepo Skeleton

**Files:**
- Create: `package.json` (workspace root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`

**Step 1: Create root `package.json`**

```json
{
  "name": "meso",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules"]
}
```

**Step 5: Install turbo and verify**

Run: `pnpm install`
Run: `pnpm turbo --version`
Expected: Turbo version prints successfully

**Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: initialize monorepo with Turborepo and pnpm workspaces"
```

---

## Task 2: Merge Git Histories into Monorepo

**Step 1: Create GitHub repo**

Run: `gh repo create bartoszrychlicki/meso --private --confirm`

**Step 2: Initialize repo and merge POS history**

```bash
git init
git remote add pos-origin https://github.com/bartoszrychlicki/meso-pos.git
git fetch pos-origin
git checkout -b main pos-origin/main
```

**Step 3: Move POS files into `apps/pos/`**

```bash
mkdir -p apps/pos
# Move all files except .git into apps/pos/
git ls-files | while read f; do
  mkdir -p "apps/pos/$(dirname "$f")"
  git mv "$f" "apps/pos/$f"
done
git commit -m "refactor: move meso-pos into apps/pos/"
```

**Step 4: Merge delivery history**

```bash
git remote add delivery-origin https://github.com/bartoszrychlicki/meso_delivery.git
git fetch delivery-origin
git merge delivery-origin/main --allow-unrelated-histories -m "merge: meso-delivery history"
```

**Step 5: Move delivery files into `apps/delivery/`**

After merge, delivery files land in `meso-app/`. Move them:

```bash
mkdir -p apps/delivery
git mv meso-app/* apps/delivery/
# Also move delivery docs/screens if present at root
git commit -m "refactor: move meso-delivery into apps/delivery/"
```

**Step 6: Move supabase migrations to root**

```bash
# POS supabase/ is the source of truth (more migrations)
mv apps/pos/supabase ./supabase
git add supabase/ apps/pos/
git commit -m "refactor: move supabase migrations to monorepo root"
```

**Step 7: Add monorepo config files from Task 1**

Copy `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` to root.

```bash
git add .
git commit -m "chore: add monorepo config (Turborepo, pnpm workspaces)"
```

**Step 8: Push to new repo**

```bash
git remote add origin https://github.com/bartoszrychlicki/meso.git
git push -u origin main
```

**Step 9: Verify both apps build**

```bash
cd apps/pos && pnpm install && pnpm build
cd ../delivery && pnpm install && pnpm build
```

Expected: Both builds pass (may need dependency adjustments)

**Step 10: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve build issues after monorepo migration"
```

---

## Task 3: Create `@meso/core` Package — Enums

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/enums.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/src/__tests__/enums.test.ts`

**Step 1: Create package.json**

File: `packages/core/package.json`
```json
{
  "name": "@meso/core",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "lint": "echo 'no lint configured'"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "^3.2.4"
  },
  "dependencies": {
    "zod": "^4.3.6"
  }
}
```

Note: Using `"main": "./src/index.ts"` — Turborepo + Next.js transpile workspace packages directly from source. No build step needed for `@meso/core`.

**Step 2: Create tsconfig.json**

File: `packages/core/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/__tests__/**"]
}
```

**Step 3: Copy enums from POS**

File: `packages/core/src/enums.ts`

Copy entire content of `apps/pos/src/types/enums.ts` (205 lines) into this file. No changes needed — this IS the source of truth now.

**Step 4: Create index.ts**

File: `packages/core/src/index.ts`
```typescript
export * from './enums';
```

**Step 5: Write test to verify enum exports**

File: `packages/core/src/__tests__/enums.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import {
  OrderStatus,
  OrderChannel,
  PaymentMethod,
  PaymentStatus,
  ModifierAction,
  LoyaltyTier,
} from '../index';

describe('@meso/core enums', () => {
  it('exports OrderStatus with all values', () => {
    expect(OrderStatus.PENDING).toBe('pending');
    expect(OrderStatus.DELIVERED).toBe('delivered');
    expect(OrderStatus.CANCELLED).toBe('cancelled');
  });

  it('exports OrderChannel with delivery_app', () => {
    expect(OrderChannel.DELIVERY_APP).toBe('delivery_app');
  });

  it('exports ModifierAction with all values', () => {
    expect(ModifierAction.ADD).toBe('add');
    expect(ModifierAction.REMOVE).toBe('remove');
    expect(ModifierAction.SUBSTITUTE).toBe('substitute');
    expect(ModifierAction.PREPARATION).toBe('preparation');
  });

  it('exports LoyaltyTier', () => {
    expect(LoyaltyTier.BRONZE).toBe('bronze');
    expect(LoyaltyTier.GOLD).toBe('gold');
  });
});
```

**Step 6: Run test**

Run: `cd packages/core && npx vitest run`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat: create @meso/core package with shared enums"
```

---

## Task 4: Add Types to `@meso/core`

**Files:**
- Create: `packages/core/src/types/common.ts`
- Create: `packages/core/src/types/order.ts`
- Create: `packages/core/src/types/api-response.ts`
- Create: `packages/core/src/types/index.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/__tests__/types.test.ts`

**Step 1: Create common types**

File: `packages/core/src/types/common.ts`

Copy from `apps/pos/src/types/common.ts` — keep `BaseEntity`, `Address`, `PaginatedResult`. Do NOT copy Location/Config types (those are POS-internal).

```typescript
import { LocationType } from '../enums';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

**Step 2: Create order types**

File: `packages/core/src/types/order.ts`

Copy from `apps/pos/src/types/order.ts` — the entire file. Add delivery-specific fields from delivery's schema.

```typescript
import {
  ModifierAction,
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../enums';
import { Address, BaseEntity } from './common';

export interface OrderItemModifier {
  modifier_id: string;
  name: string;
  price: number;
  quantity: number;
  modifier_action: ModifierAction;
}

export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  modifiers: OrderItemModifier[];
  subtotal: number;
  notes?: string;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  timestamp: string;
  changed_by?: string;
  note?: string;
}

export interface Order extends BaseEntity {
  order_number: string;
  status: OrderStatus;
  channel: OrderChannel;
  source: OrderSource;
  location_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: Address;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  delivery_fee?: number;
  tip?: number;
  total: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  status_history: OrderStatusEntry[];
  assigned_to?: string;
  estimated_ready_at?: string;
  external_order_id?: string;
  external_channel?: string;
  metadata?: Record<string, unknown>;
  promo_code?: string;
  promo_discount?: number;
  scheduled_time?: string;
  delivery_type?: 'delivery' | 'pickup';
  loyalty_points_earned?: number;
  // Lifecycle timestamps
  paid_at?: string;
  confirmed_at?: string;
  preparing_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
}
```

**Step 3: Create API response types**

File: `packages/core/src/types/api-response.ts`

Based on `apps/pos/src/lib/api/response.ts`:

```typescript
export interface ApiResponseMeta {
  total?: number;
  page?: number;
  per_page?: number;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: ApiResponseMeta;
  error?: ApiError;
}
```

**Step 4: Create types index**

File: `packages/core/src/types/index.ts`
```typescript
export * from './common';
export * from './order';
export * from './api-response';
```

**Step 5: Update core index**

File: `packages/core/src/index.ts`
```typescript
export * from './enums';
export * from './types';
```

**Step 6: Write type tests**

File: `packages/core/src/__tests__/types.test.ts`
```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { Order, OrderItem, OrderItemModifier, ApiResponse } from '../index';
import { OrderStatus, ModifierAction } from '../index';

describe('@meso/core types', () => {
  it('Order has required fields', () => {
    expectTypeOf<Order>().toHaveProperty('order_number');
    expectTypeOf<Order>().toHaveProperty('items');
    expectTypeOf<Order>().toHaveProperty('delivery_fee');
    expectTypeOf<Order>().toHaveProperty('tip');
    expectTypeOf<Order>().toHaveProperty('promo_code');
  });

  it('OrderItemModifier uses ModifierAction enum', () => {
    const modifier: OrderItemModifier = {
      modifier_id: '123',
      name: 'Extra cheese',
      price: 5,
      quantity: 1,
      modifier_action: ModifierAction.ADD,
    };
    expect(modifier.modifier_action).toBe('add');
  });

  it('ApiResponse wraps data correctly', () => {
    const response: ApiResponse<Order> = {
      success: true,
      data: {} as Order,
      meta: { timestamp: new Date().toISOString() },
    };
    expect(response.success).toBe(true);
  });
});
```

**Step 7: Run tests**

Run: `cd packages/core && npx vitest run`
Expected: PASS

**Step 8: Commit**

```bash
git add packages/core/
git commit -m "feat: add shared types to @meso/core (Order, ApiResponse, common)"
```

---

## Task 5: Add Zod Schemas to `@meso/core`

**Files:**
- Create: `packages/core/src/schemas/order.ts`
- Create: `packages/core/src/schemas/index.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/__tests__/schemas.test.ts`

**Step 1: Create order schemas**

File: `packages/core/src/schemas/order.ts`

Based on `apps/pos/src/schemas/order.ts`:

```typescript
import { z } from 'zod';
import {
  ModifierAction,
  OrderChannel,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../enums';

export const OrderItemModifierSchema = z.object({
  modifier_id: z.string().min(1),
  name: z.string().min(1),
  price: z.number(),
  quantity: z.number().int().min(1).default(1),
  modifier_action: z.nativeEnum(ModifierAction).default(ModifierAction.ADD),
});

export const CreateOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Produkt jest wymagany'),
  variant_id: z.string().optional(),
  product_name: z.string().min(1),
  variant_name: z.string().optional(),
  quantity: z.number().int().min(1, 'Minimalna ilość to 1'),
  unit_price: z.number().min(0),
  modifiers: z.array(OrderItemModifierSchema).default([]),
  notes: z.string().optional(),
});

const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const CreateOrderSchema = z.object({
  channel: z.nativeEnum(OrderChannel).default(OrderChannel.POS),
  source: z.nativeEnum(OrderSource).default(OrderSource.DINE_IN),
  location_id: z.string().min(1, 'Lokalizacja jest wymagana'),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  delivery_address: AddressSchema.optional(),
  items: z.array(CreateOrderItemSchema).min(1, 'Zamówienie musi zawierać produkty'),
  payment_method: z.nativeEnum(PaymentMethod).optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
  notes: z.string().optional(),
  discount: z.number().min(0).default(0),
  delivery_fee: z.number().min(0).optional(),
  tip: z.number().min(0).optional(),
  promo_code: z.string().optional(),
  delivery_type: z.enum(['delivery', 'pickup']).optional(),
  scheduled_time: z.string().optional(),
  external_order_id: z.string().optional(),
  external_channel: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  changed_by: z.string().optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;
```

**Step 2: Create schemas index**

File: `packages/core/src/schemas/index.ts`
```typescript
export * from './order';
```

**Step 3: Update core index**

File: `packages/core/src/index.ts`
```typescript
export * from './enums';
export * from './types';
export * from './schemas';
```

**Step 4: Write schema validation tests**

File: `packages/core/src/__tests__/schemas.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { CreateOrderSchema, UpdateOrderStatusSchema } from '../index';

describe('CreateOrderSchema', () => {
  it('validates a minimal delivery order', () => {
    const input = {
      channel: 'delivery_app',
      source: 'delivery',
      location_id: 'loc-123',
      customer_id: 'cust-456',
      items: [{
        product_id: 'prod-789',
        product_name: 'Spicy Miso Ramen',
        quantity: 1,
        unit_price: 38,
        modifiers: [{
          modifier_id: 'mod-1',
          name: 'Extra Chashu',
          price: 12,
          quantity: 1,
          modifier_action: 'add',
        }],
      }],
      payment_method: 'online',
      payment_status: 'pending',
      delivery_type: 'delivery',
      delivery_address: {
        street: 'Marszałkowska 1',
        city: 'Warszawa',
        postal_code: '00-001',
        country: 'PL',
      },
      external_order_id: 'delivery-uuid-123',
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects order without items', () => {
    const input = {
      location_id: 'loc-123',
      items: [],
    };
    const result = CreateOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('defaults modifier_action to add', () => {
    const input = {
      channel: 'delivery_app',
      source: 'delivery',
      location_id: 'loc-123',
      items: [{
        product_id: 'prod-789',
        product_name: 'Ramen',
        quantity: 1,
        unit_price: 38,
        modifiers: [{
          modifier_id: 'mod-1',
          name: 'Egg',
          price: 5,
        }],
      }],
    };
    const result = CreateOrderSchema.parse(input);
    expect(result.items[0].modifiers[0].modifier_action).toBe('add');
  });
});

describe('UpdateOrderStatusSchema', () => {
  it('validates status update with payment_status', () => {
    const input = {
      status: 'confirmed',
      payment_status: 'paid',
      note: 'P24 payment confirmed',
    };
    const result = UpdateOrderStatusSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
```

**Step 5: Run tests**

Run: `cd packages/core && npx vitest run`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat: add Zod schemas to @meso/core (CreateOrder, UpdateStatus)"
```

---

## Task 6: Create `@meso/supabase` Package

**Files:**
- Create: `packages/supabase/package.json`
- Create: `packages/supabase/tsconfig.json`
- Create: `packages/supabase/src/client.ts`
- Create: `packages/supabase/src/server.ts`
- Create: `packages/supabase/src/index.ts`

**Step 1: Create package.json**

File: `packages/supabase/package.json`
```json
{
  "name": "@meso/supabase",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.97.0"
  },
  "devDependencies": {
    "typescript": "5.9.3"
  }
}
```

**Step 2: Create browser client**

File: `packages/supabase/src/client.ts`

POS version (simpler, no custom lock). Delivery's lock timeout workaround should be app-specific if still needed.

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

**Step 3: Create server client**

File: `packages/supabase/src/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr';
import { createClient as createJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing Supabase server environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.'
    );
  }

  return createJsClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

**Step 4: Create index**

File: `packages/supabase/src/index.ts`
```typescript
export { createClient } from './client';
export { createServerSupabaseClient, createServiceClient } from './server';
```

**Step 5: Create tsconfig.json**

File: `packages/supabase/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 6: Commit**

```bash
git add packages/supabase/
git commit -m "feat: create @meso/supabase package with shared client config"
```

---

## Task 7: Create `@meso/api-client` Package

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/errors.ts`
- Create: `packages/api-client/src/orders.ts`
- Create: `packages/api-client/src/customers.ts`
- Create: `packages/api-client/src/index.ts`
- Test: `packages/api-client/src/__tests__/client.test.ts`

**Step 1: Create package.json**

File: `packages/api-client/package.json`
```json
{
  "name": "@meso/api-client",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "@meso/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "^3.2.4"
  }
}
```

**Step 2: Create error types**

File: `packages/api-client/src/errors.ts`
```typescript
import type { ApiError as ApiErrorType } from '@meso/core';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown[];

  constructor(error: ApiErrorType, status: number = 400) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

**Step 3: Create base client with retry**

File: `packages/api-client/src/client.ts`
```typescript
import type { ApiResponse } from '@meso/core';
import { ApiError, NetworkError } from './errors';

export interface MesoClientConfig {
  baseUrl: string;
  apiKey: string;
  maxRetries?: number;
  timeoutMs?: number;
  onError?: (error: ApiError | NetworkError) => void;
}

export class MesoClient {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries: number;
  private timeoutMs: number;
  private onError?: (error: ApiError | NetworkError) => void;

  constructor(config: MesoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 2;
    this.timeoutMs = config.timeoutMs ?? 8000;
    this.onError = config.onError;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | NetworkError | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        const json: ApiResponse<T> = await res.json();

        if (!json.success && json.error) {
          const apiError = new ApiError(json.error, res.status);
          // Don't retry client errors (4xx)
          if (res.status < 500) {
            this.onError?.(apiError);
            throw apiError;
          }
          // Retry server errors (5xx)
          lastError = apiError;
        } else {
          return json;
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        lastError = new NetworkError(
          err instanceof Error ? err.message : 'Network error'
        );
      }

      // Backoff before retry
      if (attempt < this.maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    this.onError?.(lastError!);
    throw lastError!;
  }
}
```

**Step 4: Create orders API module**

File: `packages/api-client/src/orders.ts`
```typescript
import type {
  ApiResponse,
  Order,
  CreateOrderInput,
  UpdateOrderStatusInput,
  PaginatedResult,
} from '@meso/core';
import { OrderStatus } from '@meso/core';
import type { MesoClient } from './client';

export class OrdersApi {
  constructor(private client: MesoClient) {}

  async create(input: CreateOrderInput): Promise<ApiResponse<Order>> {
    return this.client.request<Order>('POST', '/orders', input);
  }

  async getById(orderId: string): Promise<ApiResponse<Order>> {
    return this.client.request<Order>('GET', `/orders/${orderId}`);
  }

  async updateStatus(
    orderId: string,
    input: UpdateOrderStatusInput
  ): Promise<ApiResponse<Order>> {
    return this.client.request<Order>(
      'PATCH',
      `/orders/${orderId}/status`,
      input
    );
  }

  async list(params?: {
    page?: number;
    per_page?: number;
    status?: OrderStatus;
    date_from?: string;
    date_to?: string;
    customer?: string;
  }): Promise<ApiResponse<Order[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.client.request<Order[]>(
      'GET',
      `/orders${query ? `?${query}` : ''}`
    );
  }
}
```

**Step 5: Create customers API module**

File: `packages/api-client/src/customers.ts`
```typescript
import type { ApiResponse } from '@meso/core';
import type { MesoClient } from './client';

export interface UpdateCustomerInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

export class CustomersApi {
  constructor(private client: MesoClient) {}

  async update(
    customerId: string,
    input: UpdateCustomerInput
  ): Promise<ApiResponse<unknown>> {
    return this.client.request('PUT', `/crm/customers/${customerId}`, input);
  }

  async findByPhone(phone: string): Promise<ApiResponse<unknown>> {
    return this.client.request('GET', `/crm/customers?phone=${encodeURIComponent(phone)}`);
  }
}
```

**Step 6: Create index with factory**

File: `packages/api-client/src/index.ts`
```typescript
import { MesoClient } from './client';
import type { MesoClientConfig } from './client';
import { OrdersApi } from './orders';
import { CustomersApi } from './customers';

export { MesoClient } from './client';
export type { MesoClientConfig } from './client';
export { OrdersApi } from './orders';
export { CustomersApi } from './customers';
export { ApiError, NetworkError } from './errors';

export class PosApiClient {
  public readonly orders: OrdersApi;
  public readonly customers: CustomersApi;
  private client: MesoClient;

  constructor(config: MesoClientConfig) {
    this.client = new MesoClient(config);
    this.orders = new OrdersApi(this.client);
    this.customers = new CustomersApi(this.client);
  }
}

export function createPosApiClient(config: MesoClientConfig): PosApiClient {
  return new PosApiClient(config);
}
```

**Step 7: Create tsconfig**

File: `packages/api-client/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/__tests__/**"]
}
```

**Step 8: Write client tests**

File: `packages/api-client/src/__tests__/client.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MesoClient } from '../client';
import { ApiError, NetworkError } from '../errors';

describe('MesoClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends request with API key header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { id: '123' } }),
      status: 200,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new MesoClient({
      baseUrl: 'https://pos.example.com',
      apiKey: 'test-key',
      maxRetries: 0,
    });

    await client.request('POST', '/orders', { items: [] });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://pos.example.com/api/v1/orders',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-API-Key': 'test-key',
        }),
      })
    );
  });

  it('throws ApiError on 4xx without retry', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Bad input' },
      }),
      status: 422,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new MesoClient({
      baseUrl: 'https://pos.example.com',
      apiKey: 'test-key',
      maxRetries: 2,
    });

    await expect(client.request('POST', '/orders', {})).rejects.toThrow(ApiError);
    // Should NOT retry on 4xx — only 1 call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 errors', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Server error' },
        }),
        status: 500,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { id: '123' } }),
        status: 200,
      });
    vi.stubGlobal('fetch', mockFetch);

    const client = new MesoClient({
      baseUrl: 'https://pos.example.com',
      apiKey: 'test-key',
      maxRetries: 2,
    });

    const result = await client.request('GET', '/orders/123');
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

**Step 9: Run tests**

Run: `cd packages/api-client && npx vitest run`
Expected: PASS

**Step 10: Commit**

```bash
git add packages/api-client/
git commit -m "feat: create @meso/api-client with typed HTTP client, retry, and orders/customers APIs"
```

---

## Task 8: Wire POS App to Use `@meso/core`

**Files:**
- Modify: `apps/pos/package.json` — add `@meso/core` dependency
- Modify: `apps/pos/src/types/enums.ts` — replace with re-export
- Modify: `apps/pos/src/types/order.ts` — replace with re-export
- Modify: `apps/pos/src/types/common.ts` — replace shared types with re-export
- Modify: `apps/pos/src/schemas/order.ts` — import from `@meso/core`

**Step 1: Add workspace dependency**

In `apps/pos/package.json`, add to dependencies:
```json
"@meso/core": "workspace:*",
"@meso/supabase": "workspace:*"
```

Run: `pnpm install` (from monorepo root)

**Step 2: Replace enums.ts with re-export**

File: `apps/pos/src/types/enums.ts`
```typescript
// Re-export all enums from shared package
export * from '@meso/core';
```

This preserves all existing `import { OrderStatus } from '@/types/enums'` throughout POS.

**Step 3: Replace order.ts with re-export**

File: `apps/pos/src/types/order.ts`
```typescript
export type {
  Order,
  OrderItem,
  OrderItemModifier,
  OrderStatusEntry,
} from '@meso/core';
```

**Step 4: Replace shared parts of common.ts**

File: `apps/pos/src/types/common.ts` — keep POS-specific types, re-export shared ones:
```typescript
export type { BaseEntity, Address, PaginatedResult } from '@meso/core';

// POS-specific types (not in @meso/core)
import { LocationType } from '@meso/core';

export interface Location extends import('@meso/core').BaseEntity {
  name: string;
  type: LocationType;
  address: import('@meso/core').Address;
  phone?: string;
  is_active: boolean;
}

// ... keep DeliveryConfig, ReceiptConfig, KdsConfig, etc. as-is
```

**Step 5: Update schemas/order.ts to import from @meso/core**

File: `apps/pos/src/schemas/order.ts`
```typescript
export {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
} from '@meso/core';
```

**Step 6: Run build to verify nothing broke**

Run: `cd apps/pos && pnpm build`
Expected: Build passes. All existing imports via `@/types/enums` and `@/types/order` still resolve.

**Step 7: Run tests**

Run: `cd apps/pos && pnpm test`
Expected: PASS

**Step 8: Commit**

```bash
git add apps/pos/
git commit -m "refactor: wire POS app to use @meso/core for enums, types, and schemas"
```

---

## Task 9: Extend POS API for Delivery Needs

**Files:**
- Modify: `apps/pos/src/app/api/v1/orders/route.ts` — ensure delivery fields are handled
- Modify: `apps/pos/src/app/api/v1/orders/[id]/status/route.ts` — accept `payment_status` in PATCH
- Create: `apps/pos/src/app/api/v1/crm/coupons/[id]/route.ts` — new endpoint for coupon status
- Test: Integration tests for new/modified endpoints

**Step 1: Verify POS order creation handles delivery fields**

Read `apps/pos/src/app/api/v1/orders/route.ts` and ensure the POST handler:
- Accepts `delivery_fee`, `tip`, `promo_code`, `delivery_type`, `scheduled_time` from request body
- Passes them through to the database insert
- If any fields are missing from the Zod schema, add them (they were added in Task 5 to `@meso/core`)

Update the POS order route to use `CreateOrderSchema` from `@meso/core` instead of local schema.

**Step 2: Update status endpoint to accept payment_status**

File: `apps/pos/src/app/api/v1/orders/[id]/status/route.ts`

The `UpdateOrderStatusSchema` in `@meso/core` now includes `payment_status`. Update the PATCH handler to also update `payment_status` and `paid_at` when provided:

```typescript
// After status validation passes:
const updateData: Record<string, unknown> = {
  status: body.status,
  // ... existing status_history update
};

if (body.payment_status) {
  updateData.payment_status = body.payment_status;
  if (body.payment_status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }
}
```

**Step 3: Create coupon status endpoint**

File: `apps/pos/src/app/api/v1/crm/coupons/[id]/route.ts`
```typescript
import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api/response';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateApiKey(request, 'crm:write');
  if (!authResult.success) return authResult.response!;

  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('crm_customer_coupons')
    .update({
      status: body.status,
      used_at: body.status === 'used' ? new Date().toISOString() : undefined,
      order_id: body.order_id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return apiNotFound('Coupon');
  return apiSuccess(data);
}
```

**Step 4: Write integration tests**

File: `apps/pos/src/app/api/v1/__tests__/orders-delivery.test.ts`

Test that:
- POST /api/v1/orders accepts delivery-specific fields
- PATCH /api/v1/orders/:id/status accepts payment_status
- Coupon PATCH endpoint works

**Step 5: Run tests and build**

Run: `cd apps/pos && pnpm test && pnpm build`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/pos/
git commit -m "feat: extend POS API for delivery needs (payment_status, coupons, delivery fields)"
```

---

## Task 10: Wire Delivery App to `@meso/core` and `@meso/api-client`

**Files:**
- Modify: `apps/delivery/package.json` — add workspace deps
- Modify: `apps/delivery/src/hooks/useCheckout.ts` — rewrite to use POS API
- Modify: `apps/delivery/src/app/api/payments/p24/status/route.ts` — use POS API for status update
- Delete: `apps/delivery/src/types/order.ts` (replaced by @meso/core)
- Create: `apps/delivery/src/lib/pos-api.ts` — singleton POS API client

**Step 1: Add workspace dependencies**

In `apps/delivery/package.json`, add:
```json
"@meso/core": "workspace:*",
"@meso/api-client": "workspace:*",
"@meso/supabase": "workspace:*"
```

Run: `pnpm install`

**Step 2: Create POS API client singleton**

File: `apps/delivery/src/lib/pos-api.ts`
```typescript
import { createPosApiClient } from '@meso/api-client';

// Server-side only — API key must never reach the browser
export const posApi = createPosApiClient({
  baseUrl: process.env.POS_API_URL!,
  apiKey: process.env.POS_API_KEY!,
});
```

**Step 3: Create server action for order creation**

Since `useCheckout` runs on client but POS API key is server-side, create a server action:

File: `apps/delivery/src/app/actions/create-order.ts`
```typescript
'use server'

import { posApi } from '@/lib/pos-api';
import type { CreateOrderInput } from '@meso/core';

export async function createOrderAction(input: CreateOrderInput) {
  const response = await posApi.orders.create(input);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create order');
  }
  return response.data!;
}
```

**Step 4: Rewrite useCheckout**

File: `apps/delivery/src/hooks/useCheckout.ts`

Replace the Supabase INSERT calls (lines 131-214) with POS API calls:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { createOrderAction } from '@/app/actions/create-order'
import type { AddressFormData, DeliveryFormData, PaymentFormData } from '@/lib/validators/checkout'
import { OrderChannel, OrderSource, ModifierAction } from '@meso/core'

// Keep buildCheckoutProfileUpdate and buildOrderCustomerFields as-is

export function useCheckout() {
    const router = useRouter()
    const supabase = createClient()
    const { user } = useAuth()
    const { items, getTotal, getSubtotal, getDeliveryFee, getPaymentFee, getDiscount, tip, promoCode, loyaltyCoupon, clearCart } = useCartStore()

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submitOrder = async (
        deliveryData: DeliveryFormData,
        addressData: AddressFormData,
        paymentData: PaymentFormData,
        savePhoneToProfile?: boolean
    ) => {
        if (isLoading) return

        try {
            setIsLoading(true)
            setError(null)

            if (!user) throw new Error('Musisz być zalogowany, aby złożyć zamówienie')
            if (items.length === 0) throw new Error('Twój koszyk jest pusty')

            const isPayOnPickup = paymentData.method === 'pay_on_pickup'
            const externalOrderId = crypto.randomUUID()

            // Build scheduled_time
            let scheduledTimestamp: string | undefined
            if (deliveryData.time === 'scheduled' && deliveryData.scheduledTime) {
                const today = new Date()
                const [hours, minutes] = deliveryData.scheduledTime.split(':').map(Number)
                today.setHours(hours, minutes, 0, 0)
                scheduledTimestamp = today.toISOString()
            }

            // 1. Create order via POS API (server action)
            const order = await createOrderAction({
                channel: OrderChannel.DELIVERY_APP,
                source: OrderSource.DELIVERY,
                location_id: deliveryData.locationId || '',
                customer_id: user.id,
                customer_name: buildOrderCustomerFields(addressData).customer_name || undefined,
                customer_phone: buildOrderCustomerFields(addressData).customer_phone || undefined,
                delivery_address: {
                    street: addressData.street || '',
                    city: addressData.city || '',
                    postal_code: addressData.postalCode || '',
                    country: 'PL',
                },
                items: items.map(item => ({
                    product_id: item.productId,
                    product_name: item.name,
                    quantity: item.quantity,
                    unit_price: item.price + (item.variantPrice || 0),
                    variant_id: item.variantId,
                    variant_name: item.variantName,
                    modifiers: item.addons.map(addon => ({
                        modifier_id: addon.id,
                        name: addon.name,
                        price: addon.price,
                        quantity: 1,
                        modifier_action: ModifierAction.ADD,
                    })),
                })),
                payment_method: isPayOnPickup ? undefined : 'online' as any,
                payment_status: isPayOnPickup ? 'paid' as any : 'pending' as any,
                discount: getDiscount(),
                delivery_fee: getDeliveryFee() + getPaymentFee(),
                tip,
                promo_code: promoCode || loyaltyCoupon?.code || undefined,
                delivery_type: deliveryData.type as 'delivery' | 'pickup',
                scheduled_time: scheduledTimestamp,
                external_order_id: externalOrderId,
                notes: addressData.notes,
            })

            // 2. Save customer profile (still direct Supabase — delivery's own customer data)
            const profileUpdate = buildCheckoutProfileUpdate(addressData, savePhoneToProfile)
            if (Object.keys(profileUpdate).length > 0) {
                await supabase
                    .from('crm_customers')
                    .update(profileUpdate)
                    .eq('id', user.id)
            }

            // 3. Mark loyalty coupon as used (via POS API in future, direct for now)
            if (loyaltyCoupon) {
                await supabase
                    .from('crm_customer_coupons')
                    .update({
                        status: 'used',
                        used_at: new Date().toISOString(),
                        order_id: order.id,
                    })
                    .eq('id', loyaltyCoupon.id)
                    .eq('customer_id', user.id)
            }

            // 4. Payment flow (unchanged)
            if (isPayOnPickup) {
                clearCart()
                router.push(`/order-confirmation?orderId=${order.id}`)
            } else {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 30_000)
                const response = await fetch('/api/payments/p24/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: order.id }),
                    signal: controller.signal,
                })
                clearTimeout(timeoutId)

                let data
                const contentType = response.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json()
                } else {
                    if (response.status === 404) {
                        throw new Error('Usługa płatności jest niedostępna (404).')
                    }
                    throw new Error(`Błąd serwera płatności: ${response.status}`)
                }

                if (!response.ok) {
                    throw new Error(data.error || 'Błąd podczas rejestracji płatności')
                }

                if (data.url) {
                    clearCart()
                    window.location.href = data.url
                } else {
                    throw new Error('Nie otrzymano linku do płatności')
                }
            }
        } catch (err) {
            const isAbort = err instanceof DOMException && err.name === 'AbortError'
            const message = isAbort
                ? 'Serwer płatności nie odpowiada. Spróbuj ponownie za chwilę.'
                : err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd'
            setError(message)
            toast.error(message)
            setIsLoading(false)
        }
    }

    return { submitOrder, isLoading, error }
}
```

**Step 5: Rewrite P24 callback to use POS API**

File: `apps/delivery/src/app/api/payments/p24/status/route.ts`

Replace lines 70-83 (direct Supabase update) with:

```typescript
// Replace the supabaseAdmin order update with POS API call:
import { posApi } from '@/lib/pos-api'

// Instead of supabaseAdmin.from('orders_orders').update(...)
const updateResult = await posApi.orders.updateStatus(paramOrderId, {
  status: 'confirmed' as any,
  payment_status: 'paid' as any,
  note: `P24 payment verified. Transaction: ${orderId}`,
})

if (!updateResult.success) {
  console.error('[P24 Status] Failed to update order via POS API:', updateResult.error)
  return NextResponse.json({ error: 'Order update failed' }, { status: 500 })
}

const updatedOrder = updateResult.data
```

Keep the email sending logic as-is (it queries full order data from Supabase for email template — this is a read, which is allowed).

**Step 6: Add env vars**

File: `apps/delivery/.env.local` — add:
```env
POS_API_URL=https://meso-pos.vercel.app
POS_API_KEY=<generate-from-pos-api-keys-endpoint>
```

**Step 7: Run build**

Run: `cd apps/delivery && pnpm build`
Expected: Build passes

**Step 8: Commit**

```bash
git add apps/delivery/
git commit -m "feat: rewrite delivery to use POS API for order creation and status updates"
```

---

## Task 11: Remove Operator Panel from Delivery

**Files:**
- Delete: `apps/delivery/src/app/api/operator/` (all files)
- Delete: `apps/delivery/src/app/(operator)/` or wherever operator UI lives
- Create: `apps/pos/src/app/(dashboard)/online-orders/page.tsx` — new POS view for delivery orders

**Step 1: Identify operator files in delivery**

```bash
find apps/delivery/src -path "*operator*" -type f
```

**Step 2: Delete operator API routes and UI**

Remove all operator-related files from delivery.

**Step 3: Create minimal online-orders view in POS**

File: `apps/pos/src/app/(dashboard)/online-orders/page.tsx`

A view that shows orders with `channel: 'delivery_app'`, using existing POS order components. This can reuse the existing orders module — just filter by channel.

**Step 4: Run builds for both apps**

Run: `pnpm turbo run build`
Expected: Both pass

**Step 5: Commit**

```bash
git add apps/delivery/ apps/pos/
git commit -m "refactor: move operator panel from delivery to POS, add online-orders view"
```

---

## Task 12: RLS Lockdown

**Files:**
- Create: `supabase/migrations/YYYYMMDD_rls_delivery_readonly.sql`

**Step 1: Write migration**

```sql
-- Delivery app (anon role) can only SELECT on business tables
-- POS API (service_role) retains full access

-- Orders: anon can read own orders only
ALTER POLICY "anon_orders_select" ON orders_orders
  USING (auth.uid() = customer_id);

-- Revoke INSERT/UPDATE/DELETE for anon on key tables
REVOKE INSERT, UPDATE, DELETE ON orders_orders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON orders_order_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON orders_kitchen_tickets FROM anon;

-- Menu: keep SELECT for anon (public data)
-- CRM customers: anon can read own profile
-- CRM coupons: anon can read own coupons (write goes through POS API now)
REVOKE UPDATE ON crm_customer_coupons FROM anon;
```

Note: Exact policies depend on existing RLS setup. Review current policies before writing migration.

**Step 2: Test locally**

Verify delivery app can still:
- Read menu products
- Read own orders
- Subscribe to realtime updates

Verify delivery app CANNOT:
- INSERT into orders_orders
- UPDATE orders_orders
- INSERT into orders_order_items

**Step 3: Deploy migration**

Run: `npx supabase db push --project-ref gyxcdrcdnnzjdmcrwbpr`

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: RLS lockdown — delivery app is read-only on business tables"
```

---

## Task 13: Cleanup

**Files:**
- Delete: `apps/delivery/src/lib/table-mapping.ts` (no longer needed)
- Delete: `apps/delivery/src/types/order.ts` (if not already replaced)
- Modify: Remove any direct Supabase INSERT/UPDATE calls that remain in delivery

**Step 1: Search for remaining direct writes**

```bash
cd apps/delivery
grep -r "\.insert(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
grep -r "\.update(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
grep -r "\.delete(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
```

Allowed writes (keep):
- `supabase.auth.*` (auth operations)
- Customer profile updates (reading own data)

Not allowed (replace with POS API or remove):
- Any INSERT/UPDATE on `orders_*` tables
- Any UPDATE on `crm_customer_coupons`

**Step 2: Delete deprecated files**

```bash
rm apps/delivery/src/lib/table-mapping.ts
```

**Step 3: Final build**

Run: `pnpm turbo run build test`
Expected: All green

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: cleanup — remove deprecated delivery files and remaining direct DB writes"
```

---

## Task 14: Relink Vercel Projects

**Step 1: In Vercel Dashboard — POS project**

- Settings → Git → Connected Repository → change to `bartoszrychlicki/meso`
- Settings → General → Root Directory → `apps/pos`
- Settings → General → Build Command → `cd ../.. && npx turbo run build --filter=pos`
- Settings → General → Install Command → `cd ../.. && pnpm install`

**Step 2: In Vercel Dashboard — Delivery project**

- Settings → Git → Connected Repository → change to `bartoszrychlicki/meso`
- Settings → General → Root Directory → `apps/delivery`
- Settings → General → Build Command → `cd ../.. && npx turbo run build --filter=delivery`
- Settings → General → Install Command → `cd ../.. && pnpm install`

**Step 3: Add env vars to delivery Vercel project**

```
POS_API_URL=https://<pos-vercel-domain>
POS_API_KEY=<generated-api-key>
```

**Step 4: Trigger deploy for both projects**

Push a small change to verify both build correctly from monorepo.

**Step 5: Verify domains still work**

- POS: check pos domain loads
- Delivery: check `order.mesofood.pl` loads

**Step 6: Archive old repos**

On GitHub, archive `meso-pos` and `meso_delivery` repos (Settings → Danger Zone → Archive).

---

## Task 15: End-to-End Verification

**Step 1: Generate API key in POS**

POST to `/api/v1/api-keys` to create a key for delivery app with permissions:
`orders:read`, `orders:write`, `orders:status`, `crm:read`, `crm:write`

**Step 2: Test full order flow**

1. Open delivery app
2. Browse menu (direct Supabase read)
3. Add items to cart
4. Go to checkout
5. Submit order → should call POS API → order appears in POS
6. Pay via P24 sandbox → callback updates order via POS API
7. Check order status in delivery (Supabase Realtime)
8. Update status in POS → delivery sees real-time update

**Step 3: Test error cases**

1. Submit order with invalid product_id → POS API returns 422
2. Simulate POS API timeout → delivery shows retry message
3. Submit duplicate order (same external_order_id) → POS returns existing order
4. Try direct INSERT from delivery → Supabase returns RLS error

**Step 4: Verify builds**

```bash
pnpm turbo run build test lint type-check
```

Expected: All pass

**Step 5: Final commit**

```bash
git commit --allow-empty -m "chore: monorepo migration complete — verified E2E"
```
