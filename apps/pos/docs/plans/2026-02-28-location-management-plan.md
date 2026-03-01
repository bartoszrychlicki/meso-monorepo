# Location Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add location CRUD + per-location settings (delivery, receipt, KDS) with global defaults fallback in the Settings page.

**Architecture:** Two new DB tables (`location_receipt_config`, `location_kds_config`) alongside existing `orders_delivery_config`. Global defaults in `app_config`. Supabase for data, Zustand store for client state, Next.js API routes for CRUD, React Hook Form + Zod for forms.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase PostgreSQL, Zustand, Zod, shadcn/ui, React Hook Form, Tailwind CSS.

**Design doc:** `docs/plans/2026-02-28-location-management-design.md`

---

## Task 1: Database Migration — New Tables + Seed Global Defaults

**Files:**
- Create: `supabase/migrations/20260228100000_location_config_tables.sql`

**Step 1: Write the migration SQL**

Create file `supabase/migrations/20260228100000_location_config_tables.sql`:

```sql
-- ============================================================================
-- Migration: location_receipt_config + location_kds_config tables
-- Per-location receipt and KDS settings with NULL = use global default
-- ============================================================================

-- 1. location_receipt_config
CREATE TABLE IF NOT EXISTS location_receipt_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES users_locations(id) ON DELETE CASCADE,
    receipt_header TEXT,
    receipt_footer TEXT,
    print_automatically BOOLEAN,
    show_logo BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(location_id)
);

CREATE INDEX IF NOT EXISTS idx_location_receipt_config_location
    ON location_receipt_config(location_id);

CREATE TRIGGER set_updated_at_location_receipt_config
    BEFORE UPDATE ON location_receipt_config
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

ALTER TABLE location_receipt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_receipt_config" ON location_receipt_config
    FOR SELECT USING (true);

CREATE POLICY "staff_manage_receipt_config" ON location_receipt_config
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    );

-- 2. location_kds_config
CREATE TABLE IF NOT EXISTS location_kds_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES users_locations(id) ON DELETE CASCADE,
    alert_time_minutes INTEGER,
    auto_accept_orders BOOLEAN,
    sound_enabled BOOLEAN,
    display_priority BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(location_id)
);

CREATE INDEX IF NOT EXISTS idx_location_kds_config_location
    ON location_kds_config(location_id);

CREATE TRIGGER set_updated_at_location_kds_config
    BEFORE UPDATE ON location_kds_config
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

ALTER TABLE location_kds_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_kds_config" ON location_kds_config
    FOR SELECT USING (true);

CREATE POLICY "staff_manage_kds_config" ON location_kds_config
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users_users WHERE email = auth.jwt() ->> 'email')
    );

-- 3. Seed global defaults into app_config
INSERT INTO app_config (key, value, description) VALUES
    ('receipt_defaults', '{"header": "MESO Restaurant\\nul. Przykładowa 123\\n00-001 Warszawa", "footer": "Dziękujemy za zamówienie!\\nZapraszamy ponownie", "print_automatically": true, "show_logo": true}', 'Global default receipt settings (fallback for locations without override)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_config (key, value, description) VALUES
    ('kds_defaults', '{"alert_time_minutes": 10, "auto_accept_orders": false, "sound_enabled": true, "display_priority": true}', 'Global default KDS settings (fallback for locations without override)')
ON CONFLICT (key) DO NOTHING;
```

**Step 2: Push migration to Supabase**

Run: `npx supabase db push --linked`

Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/20260228100000_location_config_tables.sql
git commit -m "feat(db): add location_receipt_config, location_kds_config tables and global defaults"
```

---

## Task 2: TypeScript Types & Zod Schemas

**Files:**
- Modify: `src/types/common.ts` — add config types
- Create: `src/schemas/location.ts` — Zod schemas for location CRUD + config

**Step 1: Add TypeScript types to `src/types/common.ts`**

Add these types after the existing `Location` interface:

```typescript
export interface DeliveryConfig {
  id: string;
  location_id: string;
  delivery_radius_km: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_minutes: number;
  is_delivery_active: boolean;
  opening_time: string;
  closing_time: string;
  pickup_time_min: number;
  pickup_time_max: number;
  pickup_buffer_after_open: number;
  pickup_buffer_before_close: number;
  pay_on_pickup_enabled: boolean;
  pay_on_pickup_fee: number;
  pay_on_pickup_max_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReceiptConfig {
  id: string;
  location_id: string;
  receipt_header: string | null;
  receipt_footer: string | null;
  print_automatically: boolean | null;
  show_logo: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface KdsConfig {
  id: string;
  location_id: string;
  alert_time_minutes: number | null;
  auto_accept_orders: boolean | null;
  sound_enabled: boolean | null;
  display_priority: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptDefaults {
  header: string;
  footer: string;
  print_automatically: boolean;
  show_logo: boolean;
}

export interface KdsDefaults {
  alert_time_minutes: number;
  auto_accept_orders: boolean;
  sound_enabled: boolean;
  display_priority: boolean;
}

export interface LocationWithConfigs extends Location {
  delivery_config: DeliveryConfig | null;
  receipt_config: ReceiptConfig | null;
  kds_config: KdsConfig | null;
}
```

**Step 2: Create Zod schemas in `src/schemas/location.ts`**

```typescript
import { z } from 'zod';
import { LocationType } from '@/types/enums';

// --- Address ---

export const AddressSchema = z.object({
  street: z.string().min(1, 'Ulica jest wymagana'),
  city: z.string().min(1, 'Miasto jest wymagane'),
  postal_code: z.string().min(1, 'Kod pocztowy jest wymagany'),
  country: z.string().default('PL'),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

// --- Location CRUD ---

export const CreateLocationSchema = z.object({
  name: z.string().min(1, 'Nazwa lokalizacji jest wymagana'),
  type: z.nativeEnum(LocationType, { errorMap: () => ({ message: 'Wybierz typ lokalizacji' }) }),
  address: AddressSchema,
  phone: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();

// --- Delivery Config ---

export const UpdateDeliveryConfigSchema = z.object({
  delivery_radius_km: z.number().min(0.1, 'Min. 0.1 km').max(100, 'Max. 100 km'),
  delivery_fee: z.number().min(0, 'Nie może być ujemna'),
  min_order_amount: z.number().min(0, 'Nie może być ujemna'),
  estimated_delivery_minutes: z.number().int().min(1, 'Min. 1 minuta'),
  is_delivery_active: z.boolean(),
  opening_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  pickup_time_min: z.number().int().min(1),
  pickup_time_max: z.number().int().min(1),
  pickup_buffer_after_open: z.number().int().min(0),
  pickup_buffer_before_close: z.number().int().min(0),
  pay_on_pickup_enabled: z.boolean(),
  pay_on_pickup_fee: z.number().min(0),
  pay_on_pickup_max_order: z.number().min(0),
}).partial();

// --- Receipt Config ---

export const UpdateReceiptConfigSchema = z.object({
  receipt_header: z.string().nullable(),
  receipt_footer: z.string().nullable(),
  print_automatically: z.boolean().nullable(),
  show_logo: z.boolean().nullable(),
});

// --- KDS Config ---

export const UpdateKdsConfigSchema = z.object({
  alert_time_minutes: z.number().int().min(1).nullable(),
  auto_accept_orders: z.boolean().nullable(),
  sound_enabled: z.boolean().nullable(),
  display_priority: z.boolean().nullable(),
});

// --- Global Defaults ---

export const UpdateReceiptDefaultsSchema = z.object({
  header: z.string().min(1, 'Nagłówek jest wymagany'),
  footer: z.string().min(1, 'Stopka jest wymagana'),
  print_automatically: z.boolean(),
  show_logo: z.boolean(),
});

export const UpdateKdsDefaultsSchema = z.object({
  alert_time_minutes: z.number().int().min(1, 'Min. 1 minuta'),
  auto_accept_orders: z.boolean(),
  sound_enabled: z.boolean(),
  display_priority: z.boolean(),
});

// --- Type exports ---

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type UpdateDeliveryConfigInput = z.infer<typeof UpdateDeliveryConfigSchema>;
export type UpdateReceiptConfigInput = z.infer<typeof UpdateReceiptConfigSchema>;
export type UpdateKdsConfigInput = z.infer<typeof UpdateKdsConfigSchema>;
export type UpdateReceiptDefaultsInput = z.infer<typeof UpdateReceiptDefaultsSchema>;
export type UpdateKdsDefaultsInput = z.infer<typeof UpdateKdsDefaultsSchema>;
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add src/types/common.ts src/schemas/location.ts
git commit -m "feat: add location config types and Zod schemas"
```

---

## Task 3: Location Settings Store (Zustand)

**Files:**
- Create: `src/modules/settings/store.ts`

**Step 1: Create the settings store**

Create file `src/modules/settings/store.ts`:

```typescript
'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import {
  Location,
  DeliveryConfig,
  ReceiptConfig,
  KdsConfig,
  ReceiptDefaults,
  KdsDefaults,
} from '@/types/common';

interface LocationSettingsStore {
  // All locations (including inactive for admin)
  allLocations: Location[];
  isLoading: boolean;

  // Currently editing location's configs
  editingLocation: Location | null;
  deliveryConfig: DeliveryConfig | null;
  receiptConfig: ReceiptConfig | null;
  kdsConfig: KdsConfig | null;
  isLoadingConfigs: boolean;

  // Global defaults
  receiptDefaults: ReceiptDefaults | null;
  kdsDefaults: KdsDefaults | null;

  // Actions
  loadAllLocations: () => Promise<void>;
  loadLocationWithConfigs: (locationId: string) => Promise<void>;
  loadGlobalDefaults: () => Promise<void>;

  createLocation: (data: Partial<Location>) => Promise<Location>;
  updateLocation: (id: string, data: Partial<Location>) => Promise<void>;
  deactivateLocation: (id: string) => Promise<void>;
  reactivateLocation: (id: string) => Promise<void>;

  saveDeliveryConfig: (locationId: string, data: Partial<DeliveryConfig>) => Promise<void>;
  saveReceiptConfig: (locationId: string, data: Partial<ReceiptConfig>) => Promise<void>;
  saveKdsConfig: (locationId: string, data: Partial<KdsConfig>) => Promise<void>;

  saveReceiptDefaults: (data: ReceiptDefaults) => Promise<void>;
  saveKdsDefaults: (data: KdsDefaults) => Promise<void>;
}

export const useLocationSettingsStore = create<LocationSettingsStore>()((set, get) => ({
  allLocations: [],
  isLoading: false,
  editingLocation: null,
  deliveryConfig: null,
  receiptConfig: null,
  kdsConfig: null,
  isLoadingConfigs: false,
  receiptDefaults: null,
  kdsDefaults: null,

  loadAllLocations: async () => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('users_locations')
        .select('*')
        .order('name');
      set({ allLocations: (data || []) as Location[] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadLocationWithConfigs: async (locationId: string) => {
    set({ isLoadingConfigs: true });
    try {
      const supabase = createClient();

      const [locResult, deliveryResult, receiptResult, kdsResult] = await Promise.all([
        supabase.from('users_locations').select('*').eq('id', locationId).single(),
        supabase.from('orders_delivery_config').select('*').eq('location_id', locationId).maybeSingle(),
        supabase.from('location_receipt_config').select('*').eq('location_id', locationId).maybeSingle(),
        supabase.from('location_kds_config').select('*').eq('location_id', locationId).maybeSingle(),
      ]);

      set({
        editingLocation: locResult.data as Location | null,
        deliveryConfig: deliveryResult.data as DeliveryConfig | null,
        receiptConfig: receiptResult.data as ReceiptConfig | null,
        kdsConfig: kdsResult.data as KdsConfig | null,
      });
    } finally {
      set({ isLoadingConfigs: false });
    }
  },

  loadGlobalDefaults: async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .in('key', ['receipt_defaults', 'kds_defaults']);

    const defaults: Record<string, unknown> = {};
    for (const row of data || []) {
      defaults[row.key] = row.value;
    }

    set({
      receiptDefaults: (defaults['receipt_defaults'] as ReceiptDefaults) || null,
      kdsDefaults: (defaults['kds_defaults'] as KdsDefaults) || null,
    });
  },

  createLocation: async (data) => {
    const supabase = createClient();
    const { data: created, error } = await supabase
      .from('users_locations')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const location = created as Location;
    set({ allLocations: [...get().allLocations, location] });
    return location;
  },

  updateLocation: async (id, data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('users_locations')
      .update(data)
      .eq('id', id);

    if (error) throw new Error(error.message);

    set({
      allLocations: get().allLocations.map((l) =>
        l.id === id ? { ...l, ...data } : l
      ),
      editingLocation: get().editingLocation?.id === id
        ? { ...get().editingLocation!, ...data }
        : get().editingLocation,
    });
  },

  deactivateLocation: async (id) => {
    await get().updateLocation(id, { is_active: false } as Partial<Location>);
  },

  reactivateLocation: async (id) => {
    await get().updateLocation(id, { is_active: true } as Partial<Location>);
  },

  saveDeliveryConfig: async (locationId, data) => {
    const supabase = createClient();
    const existing = get().deliveryConfig;

    if (existing) {
      const { error } = await supabase
        .from('orders_delivery_config')
        .update(data)
        .eq('location_id', locationId);
      if (error) throw new Error(error.message);
      set({ deliveryConfig: { ...existing, ...data } as DeliveryConfig });
    } else {
      const { data: created, error } = await supabase
        .from('orders_delivery_config')
        .insert({ ...data, location_id: locationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      set({ deliveryConfig: created as DeliveryConfig });
    }
  },

  saveReceiptConfig: async (locationId, data) => {
    const supabase = createClient();
    const existing = get().receiptConfig;

    if (existing) {
      const { error } = await supabase
        .from('location_receipt_config')
        .update(data)
        .eq('location_id', locationId);
      if (error) throw new Error(error.message);
      set({ receiptConfig: { ...existing, ...data } as ReceiptConfig });
    } else {
      const { data: created, error } = await supabase
        .from('location_receipt_config')
        .insert({ ...data, location_id: locationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      set({ receiptConfig: created as ReceiptConfig });
    }
  },

  saveKdsConfig: async (locationId, data) => {
    const supabase = createClient();
    const existing = get().kdsConfig;

    if (existing) {
      const { error } = await supabase
        .from('location_kds_config')
        .update(data)
        .eq('location_id', locationId);
      if (error) throw new Error(error.message);
      set({ kdsConfig: { ...existing, ...data } as KdsConfig });
    } else {
      const { data: created, error } = await supabase
        .from('location_kds_config')
        .insert({ ...data, location_id: locationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      set({ kdsConfig: created as KdsConfig });
    }
  },

  saveReceiptDefaults: async (data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'receipt_defaults', value: data });
    if (error) throw new Error(error.message);
    set({ receiptDefaults: data });
  },

  saveKdsDefaults: async (data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'kds_defaults', value: data });
    if (error) throw new Error(error.message);
    set({ kdsDefaults: data });
  },
}));
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

Expected: No errors.

**Step 3: Commit**

```bash
git add src/modules/settings/store.ts
git commit -m "feat: add location settings Zustand store"
```

---

## Task 4: Location List UI — Replace Settings Placeholder

**Files:**
- Create: `src/modules/settings/components/location-list.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx` — replace placeholder with LocationList

**Step 1: Create `src/modules/settings/components/location-list.tsx`**

This component renders the table of locations in the Settings > Lokalizacje tab. It:
- Loads all locations (including inactive) via `useLocationSettingsStore`
- Displays icon by type (Building2 for central_kitchen, Truck for food_truck, Store for kiosk/restaurant)
- Shows active/inactive badge
- "Edytuj" button navigates to `/settings/locations/[id]`
- "+ Dodaj lokalizację" button navigates to `/settings/locations/new`
- Admin sees all + can add. Manager sees only their assigned location.

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Truck, Store, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LocationType } from '@/types/enums';
import { useLocationSettingsStore } from '@/modules/settings/store';
import { useUserStore } from '@/modules/users/store';

const TYPE_ICONS: Record<string, React.ElementType> = {
  [LocationType.CENTRAL_KITCHEN]: Building2,
  [LocationType.FOOD_TRUCK]: Truck,
  [LocationType.KIOSK]: Store,
  [LocationType.RESTAURANT]: Store,
};

const TYPE_LABELS: Record<string, string> = {
  [LocationType.CENTRAL_KITCHEN]: 'Kuchnia Centralna',
  [LocationType.FOOD_TRUCK]: 'Food Truck',
  [LocationType.KIOSK]: 'Kiosk',
  [LocationType.RESTAURANT]: 'Restauracja',
};

export function LocationList() {
  const router = useRouter();
  const { allLocations, isLoading, loadAllLocations } = useLocationSettingsStore();
  const { currentUser } = useUserStore();

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadAllLocations();
  }, [loadAllLocations]);

  // Manager sees only their assigned location
  const visibleLocations = isAdmin
    ? allLocations
    : allLocations.filter((l) => l.id === currentUser?.location_id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lokalizacje</CardTitle>
          <CardDescription>
            Zarządzaj punktami sprzedaży i ich ustawieniami
          </CardDescription>
        </div>
        {isAdmin && (
          <Button
            onClick={() => router.push('/settings/locations/new')}
            data-action="add-location"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj lokalizację
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
        ) : visibleLocations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak lokalizacji
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLocations.map((location) => {
                const Icon = TYPE_ICONS[location.type] || Store;
                const addr = location.address;
                return (
                  <TableRow key={location.id} data-id={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {location.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[location.type] || location.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {addr?.street}, {addr?.city}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? 'default' : 'secondary'}>
                        {location.is_active ? 'Aktywna' : 'Nieaktywna'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/settings/locations/${location.id}`)}
                        data-action="edit-location"
                      >
                        Edytuj
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Update `src/app/(dashboard)/settings/page.tsx`**

Replace the Lokalizacje tab placeholder (lines ~267-283) with:

```tsx
import { LocationList } from '@/modules/settings/components/location-list';

// ... inside TabsContent value="locations":
<TabsContent value="locations" className="space-y-4">
  <LocationList />
</TabsContent>
```

Remove the old placeholder Card with MapPin icon and "Funkcja dostępna wkrótce" text.

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add src/modules/settings/components/location-list.tsx src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: replace location placeholder with location list table"
```

---

## Task 5: Location Edit/Add Page — Basic Data Tab

**Files:**
- Create: `src/app/(dashboard)/settings/locations/[id]/page.tsx`
- Create: `src/app/(dashboard)/settings/locations/new/page.tsx`
- Create: `src/modules/settings/components/location-basic-form.tsx`

**Step 1: Create the basic data form component**

Create `src/modules/settings/components/location-basic-form.tsx`:

This is a React Hook Form component for location basic data (name, type, address, phone, is_active). Uses `CreateLocationSchema` for validation. Shows deactivation toggle with confirmation for existing locations. The `onSubmit` prop receives validated data.

Pattern: Follow `src/modules/employees/components/employee-form.tsx` structure exactly:
- `useForm` with `zodResolver`
- `form.register` for inputs, `form.setValue` for selects
- `form.formState.errors` for error display
- `data-field` attributes on all inputs
- Card sections for grouping

Fields:
- name (Input, required)
- type (Select: Kuchnia Centralna / Food Truck / Kiosk / Restauracja)
- address.street (Input, required)
- address.city (Input, required)
- address.postal_code (Input, required)
- phone (Input, optional)
- is_active (Switch, with AlertDialog confirmation when turning off)

**Step 2: Create the edit page**

Create `src/app/(dashboard)/settings/locations/[id]/page.tsx`:

This page:
- Reads `params.id` from URL
- Calls `useLocationSettingsStore.loadLocationWithConfigs(id)` on mount
- Calls `useLocationSettingsStore.loadGlobalDefaults()` on mount
- Shows a back link "← Powrót do lokalizacji" that navigates to `/settings?tab=locations`
- Renders tabs: "Dane podstawowe" | "Dostawa" | "Paragony" | "KDS"
- Initially show "Dane podstawowe" tab with `LocationBasicForm`
- "Dostawa", "Paragony", "KDS" tabs are placeholder stubs (implemented in Tasks 6-8)
- On save: calls `updateLocation(id, data)`, shows `toast.success`, navigates back

**Step 3: Create the new page**

Create `src/app/(dashboard)/settings/locations/new/page.tsx`:

Same structure as edit, but:
- No id from params
- On save: calls `createLocation(data)`, shows `toast.success`, navigates to `/settings/locations/[created.id]` (so user can continue configuring delivery/receipt/kds)
- "Dostawa", "Paragony", "KDS" tabs are disabled with hint "Zapisz lokalizację aby skonfigurować"

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/settings/locations/ src/modules/settings/components/location-basic-form.tsx
git commit -m "feat: add location edit/add pages with basic data form"
```

---

## Task 6: Delivery Config Tab

**Files:**
- Create: `src/modules/settings/components/delivery-config-form.tsx`
- Modify: `src/app/(dashboard)/settings/locations/[id]/page.tsx` — wire up Dostawa tab

**Step 1: Create delivery config form**

Create `src/modules/settings/components/delivery-config-form.tsx`:

This form edits `orders_delivery_config` fields for a location. Uses `UpdateDeliveryConfigSchema` for validation. Pre-populates from `useLocationSettingsStore.deliveryConfig`.

Layout (follow employee-form Card pattern):
- Card "Dostawa" with:
  - `is_delivery_active` Switch at top — when OFF, remaining fields have `disabled` prop
  - Grid 2-col: delivery_radius_km, delivery_fee, min_order_amount, estimated_delivery_minutes
  - Grid 2-col: opening_time (Input type="time"), closing_time (Input type="time")
- Card "Odbiór osobisty":
  - Grid 2-col: pickup_time_min, pickup_time_max
  - Grid 2-col: pickup_buffer_after_open, pickup_buffer_before_close
- Card "Płatność przy odbiorze":
  - pay_on_pickup_enabled Switch
  - Grid 2-col: pay_on_pickup_fee, pay_on_pickup_max_order

On submit: calls `saveDeliveryConfig(locationId, data)`, shows `toast.success`.

**Step 2: Wire into location edit page**

In `src/app/(dashboard)/settings/locations/[id]/page.tsx`, replace the "Dostawa" tab stub with `<DeliveryConfigForm locationId={id} />`.

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/modules/settings/components/delivery-config-form.tsx src/app/\(dashboard\)/settings/locations/\[id\]/page.tsx
git commit -m "feat: add delivery config form for location settings"
```

---

## Task 7: Receipt Config Tab

**Files:**
- Create: `src/modules/settings/components/receipt-config-form.tsx`
- Modify: `src/app/(dashboard)/settings/locations/[id]/page.tsx` — wire up Paragony tab

**Step 1: Create receipt config form**

Create `src/modules/settings/components/receipt-config-form.tsx`:

This form edits `location_receipt_config` fields. Uses `UpdateReceiptConfigSchema`. Pre-populates from `useLocationSettingsStore.receiptConfig`.

Key UX: each field shows the current global default as placeholder text. A small hint under each field: "Puste = globalne ustawienie ([current global value])". Global defaults come from `useLocationSettingsStore.receiptDefaults`.

Fields:
- receipt_header (textarea, placeholder = global header)
- receipt_footer (textarea, placeholder = global footer)
- print_automatically (Switch with "Użyj globalnego" as third indeterminate state — when null. Implementation: use a tri-state: null = "Użyj domyślnego (Tak/Nie)", true, false. Simplification: just use Switch + a "Resetuj do globalnego" button per field)
- show_logo (same pattern)

Simplified approach: For boolean fields, show a Switch. Next to it, a small "Resetuj" link/button that sets the value back to null (= global). When value is null, show the global default value as the switch state but with muted styling and "(globalne)" label.

On submit: calls `saveReceiptConfig(locationId, data)`.

**Step 2: Wire into location edit page**

Replace "Paragony" tab stub with `<ReceiptConfigForm locationId={id} />`.

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/modules/settings/components/receipt-config-form.tsx src/app/\(dashboard\)/settings/locations/\[id\]/page.tsx
git commit -m "feat: add receipt config form with global fallback indicators"
```

---

## Task 8: KDS Config Tab

**Files:**
- Create: `src/modules/settings/components/kds-config-form.tsx`
- Modify: `src/app/(dashboard)/settings/locations/[id]/page.tsx` — wire up KDS tab

**Step 1: Create KDS config form**

Create `src/modules/settings/components/kds-config-form.tsx`:

Same pattern as receipt config form. Uses `UpdateKdsConfigSchema`. Fields:
- alert_time_minutes (Input type="number", placeholder = global default)
- auto_accept_orders (Switch with null/global pattern)
- sound_enabled (Switch with null/global pattern)
- display_priority (Switch with null/global pattern)

On submit: calls `saveKdsConfig(locationId, data)`.

**Step 2: Wire into location edit page**

Replace "KDS" tab stub with `<KdsConfigForm locationId={id} />`.

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/modules/settings/components/kds-config-form.tsx src/app/\(dashboard\)/settings/locations/\[id\]/page.tsx
git commit -m "feat: add KDS config form with global fallback indicators"
```

---

## Task 9: Global Defaults in Settings > Ogólne Tab

**Files:**
- Create: `src/modules/settings/components/global-defaults-forms.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx` — add global defaults cards to Ogólne tab

**Step 1: Create global defaults forms**

Create `src/modules/settings/components/global-defaults-forms.tsx`:

Two Card components:
1. `ReceiptDefaultsCard` — edits `app_config['receipt_defaults']`
   - header (textarea), footer (textarea), print_automatically (Switch), show_logo (Switch)
   - On save: `saveReceiptDefaults(data)`, toast.success

2. `KdsDefaultsCard` — edits `app_config['kds_defaults']`
   - alert_time_minutes (Input number), auto_accept_orders (Switch), sound_enabled (Switch), display_priority (Switch)
   - On save: `saveKdsDefaults(data)`, toast.success

Both load current values from `useLocationSettingsStore.loadGlobalDefaults()` on mount.

**Step 2: Add to Settings page Ogólne tab**

In `src/app/(dashboard)/settings/page.tsx`, add after the existing "Powiadomienia" Card in the `general` TabsContent:

```tsx
import { ReceiptDefaultsCard, KdsDefaultsCard } from '@/modules/settings/components/global-defaults-forms';

// ... after Powiadomienia card:
<ReceiptDefaultsCard />
<KdsDefaultsCard />
```

**Step 3: Remove or simplify the "Paragony" tab**

The receipt tab in settings currently has hardcoded receipt header/footer/auto-print. Since these are now managed as global defaults in the Ogólne tab, either:
- Remove the Paragony tab entirely (simplest)
- OR keep it as a redirect/link to the Ogólne section

Recommended: remove the tab. Update the TabsList to have 5 tabs instead of 6.

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/modules/settings/components/global-defaults-forms.tsx src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: add global receipt/KDS defaults to settings and remove old Paragony tab"
```

---

## Task 10: Build Verification & Final Polish

**Files:**
- Potentially fix any files with type errors

**Step 1: Run full build**

Run: `npm run build`

Expected: Build succeeds with no errors.

**Step 2: Fix any build errors**

If there are TypeScript errors, lint errors, or missing imports — fix them.

**Step 3: Verify the user store still works**

Check that `src/modules/users/store.ts` still loads locations correctly — the `loadLocations` method only loads `is_active: true` locations, which is correct for the location selector dropdown. The new `useLocationSettingsStore.loadAllLocations` loads ALL locations (including inactive) for the admin settings view.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors and polish location management"
```

---

## Summary of Files Changed/Created

| Action | File |
|--------|------|
| Create | `supabase/migrations/20260228100000_location_config_tables.sql` |
| Modify | `src/types/common.ts` |
| Create | `src/schemas/location.ts` |
| Create | `src/modules/settings/store.ts` |
| Create | `src/modules/settings/components/location-list.tsx` |
| Modify | `src/app/(dashboard)/settings/page.tsx` |
| Create | `src/modules/settings/components/location-basic-form.tsx` |
| Create | `src/app/(dashboard)/settings/locations/[id]/page.tsx` |
| Create | `src/app/(dashboard)/settings/locations/new/page.tsx` |
| Create | `src/modules/settings/components/delivery-config-form.tsx` |
| Create | `src/modules/settings/components/receipt-config-form.tsx` |
| Create | `src/modules/settings/components/kds-config-form.tsx` |
| Create | `src/modules/settings/components/global-defaults-forms.tsx` |
