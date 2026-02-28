# Modifiers Persistence & POS Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move modifiers from embedded JSONB in products to standalone DB entities, add management UI, modifier picker in product form, modifier selection dialog on POS, and fix save-button navigation.

**Architecture:** New `menu_modifiers` table + `product_modifiers` junction table. Supabase repository pattern (existing `createRepository` factory). Flat modifiers (no groups). Migration extracts/deduplicates existing JSONB data.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase PostgreSQL, Zustand, shadcn/ui, Zod

---

### Task 1: Database Migration — Create Tables & Migrate Data

**Files:**
- Create: `supabase/migrations/20260228100001_modifiers_standalone.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================================
-- STANDALONE MODIFIERS: tables + data migration from JSONB
-- ============================================================================

-- 1. Create menu_modifiers table
CREATE TABLE IF NOT EXISTS public.menu_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  modifier_action TEXT NOT NULL DEFAULT 'add',
  recipe_id UUID,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create product_modifiers junction table
CREATE TABLE IF NOT EXISTS public.product_modifiers (
  product_id UUID NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES public.menu_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, modifier_id)
);

-- 3. RLS policies
ALTER TABLE public.menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_modifiers_read" ON public.menu_modifiers FOR SELECT USING (true);
CREATE POLICY "menu_modifiers_write" ON public.menu_modifiers FOR ALL USING (true);
CREATE POLICY "product_modifiers_read" ON public.product_modifiers FOR SELECT USING (true);
CREATE POLICY "product_modifiers_write" ON public.product_modifiers FOR ALL USING (true);

-- 4. Migrate existing JSONB modifiers → standalone rows (deduplicated)
-- Extract unique modifiers by (name, price, modifier_action)
INSERT INTO public.menu_modifiers (name, price, modifier_action, is_available, sort_order)
SELECT DISTINCT ON (mod->>'name', (mod->>'price')::numeric, COALESCE(mod->>'modifier_action', 'add'))
  mod->>'name' AS name,
  (mod->>'price')::numeric AS price,
  COALESCE(mod->>'modifier_action', 'add') AS modifier_action,
  COALESCE((mod->>'is_available')::boolean, true) AS is_available,
  COALESCE((mod->>'sort_order')::integer, 0) AS sort_order
FROM public.menu_products,
     jsonb_array_elements(modifier_groups) AS grp,
     jsonb_array_elements(grp->'modifiers') AS mod
WHERE jsonb_array_length(modifier_groups) > 0
  AND mod->>'name' IS NOT NULL
  AND mod->>'name' != '';

-- 5. Create product_modifiers links
INSERT INTO public.product_modifiers (product_id, modifier_id)
SELECT DISTINCT p.id, m.id
FROM public.menu_products p,
     jsonb_array_elements(p.modifier_groups) AS grp,
     jsonb_array_elements(grp->'modifiers') AS mod,
     public.menu_modifiers m
WHERE jsonb_array_length(p.modifier_groups) > 0
  AND m.name = mod->>'name'
  AND m.price = (mod->>'price')::numeric
  AND m.modifier_action = COALESCE(mod->>'modifier_action', 'add');

-- 6. Indexes
CREATE INDEX idx_menu_modifiers_name ON public.menu_modifiers(name);
CREATE INDEX idx_menu_modifiers_available ON public.menu_modifiers(is_available);
CREATE INDEX idx_product_modifiers_product ON public.product_modifiers(product_id);
CREATE INDEX idx_product_modifiers_modifier ON public.product_modifiers(modifier_id);

-- 7. Updated_at trigger
CREATE TRIGGER set_updated_at_menu_modifiers
  BEFORE UPDATE ON public.menu_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Step 2: Push migration to remote Supabase**

Run: `npx supabase db push`
Expected: Migration applied successfully. Verify with `npx supabase migration list`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260228100001_modifiers_standalone.sql
git commit -m "feat: add menu_modifiers and product_modifiers tables with JSONB migration"
```

---

### Task 2: Types, Schemas & Repository

**Files:**
- Modify: `src/types/menu.ts` — add `MenuModifier` interface
- Modify: `src/types/enums.ts` — keep only ADD/REMOVE in ModifierAction
- Modify: `src/schemas/menu.ts` — add `MenuModifierSchema`
- Modify: `src/lib/data/supabase-repository.ts` — add table mappings
- Modify: `src/modules/menu/repository.ts` — add modifiers repo + Supabase helpers

**Step 1: Add `MenuModifier` type to `src/types/menu.ts`**

Add after the existing `Modifier` interface (keep old for backward compat):

```typescript
/** Standalone modifier entity (stored in menu_modifiers table) */
export interface MenuModifier extends BaseEntity {
  name: string;
  price: number;
  modifier_action: ModifierAction;
  recipe_id?: string | null;
  is_available: boolean;
  sort_order: number;
}
```

**Step 2: Update `ModifierAction` enum in `src/types/enums.ts`**

Keep existing values but we'll only use ADD and REMOVE in the UI. No code change needed — the enum already has both.

**Step 3: Add Zod schema in `src/schemas/menu.ts`**

Add after the existing `ModifierSchema`:

```typescript
/** Schema for standalone menu_modifiers table */
export const MenuModifierSchema = z.object({
  name: z.string().min(1, 'Nazwa modyfikatora jest wymagana'),
  price: z.number().min(0, 'Cena nie moze byc ujemna'),
  modifier_action: z.enum(['add', 'remove']).default('add'),
  recipe_id: z.string().uuid().nullable().optional(),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type CreateMenuModifierInput = z.infer<typeof MenuModifierSchema>;
```

**Step 4: Add table mappings in `src/lib/data/supabase-repository.ts`**

Add to `TABLE_MAP`:

```typescript
modifiers: 'menu_modifiers',
product_modifiers: 'product_modifiers',
```

**Step 5: Add modifiers repository in `src/modules/menu/repository.ts`**

Add import for `MenuModifier` and add:

```typescript
import { Product, Category, ModifierGroup, MenuModifier } from '@/types/menu';

export const modifiersRepository = createRepository<MenuModifier>('modifiers');
```

Add Supabase-specific helpers for the junction table:

```typescript
import { supabase } from '@/lib/supabase/client';

/** Get modifier IDs for a product */
export async function getProductModifierIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_modifiers')
    .select('modifier_id')
    .eq('product_id', productId);
  if (error) throw new Error(`getProductModifierIds failed: ${error.message}`);
  return (data ?? []).map((row: { modifier_id: string }) => row.modifier_id);
}

/** Set modifiers for a product (replace all) */
export async function setProductModifiers(productId: string, modifierIds: string[]): Promise<void> {
  // Delete existing links
  const { error: delError } = await supabase
    .from('product_modifiers')
    .delete()
    .eq('product_id', productId);
  if (delError) throw new Error(`setProductModifiers delete failed: ${delError.message}`);

  // Insert new links
  if (modifierIds.length > 0) {
    const rows = modifierIds.map((modifier_id) => ({
      product_id: productId,
      modifier_id,
    }));
    const { error: insError } = await supabase
      .from('product_modifiers')
      .insert(rows);
    if (insError) throw new Error(`setProductModifiers insert failed: ${insError.message}`);
  }
}

/** Get modifiers for a product (full objects) */
export async function getProductModifiers(productId: string): Promise<MenuModifier[]> {
  const { data, error } = await supabase
    .from('product_modifiers')
    .select('modifier_id')
    .eq('product_id', productId);
  if (error) throw new Error(`getProductModifiers failed: ${error.message}`);
  if (!data || data.length === 0) return [];

  const ids = data.map((row: { modifier_id: string }) => row.modifier_id);
  const { data: modifiers, error: modError } = await supabase
    .from('menu_modifiers')
    .select('*')
    .in('id', ids)
    .order('sort_order', { ascending: true });
  if (modError) throw new Error(`getProductModifiers fetch failed: ${modError.message}`);
  return (modifiers ?? []) as MenuModifier[];
}

/** Count products using a modifier */
export async function countProductsUsingModifier(modifierId: string): Promise<number> {
  const { count, error } = await supabase
    .from('product_modifiers')
    .select('product_id', { count: 'exact', head: true })
    .eq('modifier_id', modifierId);
  if (error) throw new Error(`countProductsUsingModifier failed: ${error.message}`);
  return count ?? 0;
}
```

**Step 6: Run build to verify types**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/types/menu.ts src/schemas/menu.ts src/lib/data/supabase-repository.ts src/modules/menu/repository.ts
git commit -m "feat: add MenuModifier type, schema, and repository with junction table helpers"
```

---

### Task 3: Zustand Store — Modifier CRUD

**Files:**
- Modify: `src/modules/menu/store.ts` — add modifier state and actions
- Modify: `src/modules/menu/hooks.ts` — add `useModifiers` hook

**Step 1: Update store interface and implementation in `src/modules/menu/store.ts`**

Add to the store interface:

```typescript
import { Product, Category, ModifierGroup, MenuModifier } from '@/types/menu';
import {
  productsRepository,
  categoriesRepository,
  modifierGroupsRepository,
  modifiersRepository,
  toggleAvailability,
} from './repository';
```

Add to `MenuStore` interface:

```typescript
  modifiers: MenuModifier[];

  // Modifier actions
  loadModifiers: () => Promise<void>;
  createModifier: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
  updateModifier: (id: string, data: Partial<MenuModifier>) => Promise<void>;
  deleteModifier: (id: string) => Promise<void>;
```

Add to state initial values:

```typescript
  modifiers: [],
```

Update `loadAll` to also load modifiers:

```typescript
  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [productsResult, categoriesResult, modifierGroupsResult, modifiersResult] = await Promise.all([
        productsRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 200 }),
        categoriesRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 100 }),
        modifierGroupsRepository.findAll({ per_page: 100 }),
        modifiersRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 200 }),
      ]);
      set({
        products: productsResult.data,
        categories: categoriesResult.data,
        modifierGroups: modifierGroupsResult.data,
        modifiers: modifiersResult.data,
        isLoading: false,
      });
    } catch (error) {
      console.error('[MenuStore] loadAll failed:', error);
      set({ isLoading: false });
    }
  },
```

Add modifier CRUD actions:

```typescript
  loadModifiers: async () => {
    const result = await modifiersRepository.findAll({ sort_by: 'sort_order', sort_order: 'asc', per_page: 200 });
    set({ modifiers: result.data });
  },

  createModifier: async (data) => {
    const modifier = await modifiersRepository.create(data);
    set((state) => ({ modifiers: [...state.modifiers, modifier] }));
    return modifier;
  },

  updateModifier: async (id, data) => {
    const updated = await modifiersRepository.update(id, data);
    set((state) => ({
      modifiers: state.modifiers.map((m) => (m.id === id ? updated : m)),
    }));
  },

  deleteModifier: async (id) => {
    await modifiersRepository.delete(id);
    set((state) => ({
      modifiers: state.modifiers.filter((m) => m.id !== id),
    }));
  },
```

**Step 2: Add `useModifiers` hook in `src/modules/menu/hooks.ts`**

```typescript
export function useModifiers() {
  const store = useMenuStore();

  useEffect(() => {
    if (store.modifiers.length === 0 && !store.isLoading) {
      store.loadModifiers();
    }
  }, []);

  return {
    modifiers: store.modifiers,
    isLoading: store.isLoading,
    createModifier: store.createModifier,
    updateModifier: store.updateModifier,
    deleteModifier: store.deleteModifier,
    loadModifiers: store.loadModifiers,
  };
}
```

Also update `useMenu` return to include `modifiers`:

```typescript
  return {
    ...existing,
    modifiers: store.modifiers,
  };
```

**Step 3: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/modules/menu/store.ts src/modules/menu/hooks.ts
git commit -m "feat: add modifier CRUD to menu store and useModifiers hook"
```

---

### Task 4: Modifier Management Page (`/menu/modifiers`)

**Files:**
- Create: `src/app/(dashboard)/menu/modifiers/page.tsx` — page shell
- Create: `src/modules/menu/components/modifier-management.tsx` — list + CRUD component
- Create: `src/modules/menu/components/modifier-form-dialog.tsx` — create/edit modal
- Modify: `src/components/layout/app-sidebar.tsx` — add nav item

**Step 1: Create `modifier-form-dialog.tsx`**

File: `src/modules/menu/components/modifier-form-dialog.tsx`

This is a Dialog with a form for creating/editing a modifier. Fields: name, price, modifier_action (ADD/REMOVE select), recipe (optional select), is_available (switch). On save, calls `onSave(data)`.

Key props:
```typescript
interface ModifierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifier?: MenuModifier | null;
  recipes: Recipe[];
  onSave: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}
```

Fields:
- `name`: Input text, required
- `price`: Input number (min 0, step 0.01), allows 0
- `modifier_action`: Select with "Dodatek (ADD)" / "Usuniecie (REMOVE)"
- `recipe_id`: Optional select from recipes list (with empty "Brak" option)
- `is_available`: Switch/checkbox

**Step 2: Create `modifier-management.tsx`**

File: `src/modules/menu/components/modifier-management.tsx`

Shows a searchable list of all modifiers in a table/card layout:
- Columns: Name, Price, Action (badge ADD/REMOVE), Recipe (name or "–"), Products count, Available toggle
- Actions: Edit (opens dialog), Delete (with confirm)
- Top: search input + "Nowy modyfikator" button
- Uses `useModifiers()` hook + `useRecipesStore` for recipe names
- Uses `countProductsUsingModifier` from repository for product count (or compute client-side from loaded data)

**Step 3: Create page at `src/app/(dashboard)/menu/modifiers/page.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useModifiers } from '@/modules/menu/hooks';
import { useRecipesStore } from '@/modules/recipes/store';
import { ModifierManagement } from '@/modules/menu/components/modifier-management';

export default function ModifiersPage() {
  const { modifiers, isLoading, createModifier, updateModifier, deleteModifier } = useModifiers();
  const recipes = useRecipesStore((s) => s.recipes);
  const loadRecipes = useRecipesStore((s) => s.loadRecipes);

  useEffect(() => {
    if (recipes.length === 0) loadRecipes();
  }, []);

  return (
    <div className="space-y-6" data-page="modifiers">
      <PageHeader
        title="Modyfikatory"
        description="Zarzadzaj modyfikatorami produktow"
      />
      <ModifierManagement
        modifiers={modifiers}
        recipes={recipes}
        isLoading={isLoading}
        onCreateModifier={createModifier}
        onUpdateModifier={updateModifier}
        onDeleteModifier={deleteModifier}
      />
    </div>
  );
}
```

**Step 4: Add navigation item to sidebar**

In `src/components/layout/app-sidebar.tsx`, add after the Menu item in `mainNavItems`:

```typescript
  { title: 'Modyfikatory', href: '/menu/modifiers', icon: 'Settings2' },
```

And add `Settings2` to the `iconMap` import from lucide-react.

**Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/\(dashboard\)/menu/modifiers/page.tsx src/modules/menu/components/modifier-management.tsx src/modules/menu/components/modifier-form-dialog.tsx src/components/layout/app-sidebar.tsx
git commit -m "feat: add modifier management page with CRUD at /menu/modifiers"
```

---

### Task 5: Modifier Picker in Product Form

**Files:**
- Create: `src/modules/menu/components/modifier-picker.tsx` — replaces ModifierSelector
- Modify: `src/modules/menu/components/product-form.tsx` — swap component, use DB modifiers
- Modify: `src/app/(dashboard)/menu/[id]/page.tsx` — load modifiers, pass to form
- Modify: `src/app/(dashboard)/menu/new/page.tsx` — load modifiers, pass to form

**Step 1: Create `modifier-picker.tsx`**

File: `src/modules/menu/components/modifier-picker.tsx`

Props:
```typescript
interface ModifierPickerProps {
  allModifiers: MenuModifier[];
  selectedModifierIds: string[];
  onChange: (ids: string[]) => void;
  recipes: Recipe[];
  onCreateModifier: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
}
```

UI:
- Search input at top
- Scrollable list of all modifiers, each with a Checkbox
- Each row: checkbox, name, price badge, action badge (ADD/REMOVE)
- "Stworz nowy modyfikator" button at bottom — opens `ModifierFormDialog`
- When new modifier created, auto-select it

**Step 2: Update `product-form.tsx`**

- Replace `ModifierSelector` import with `ModifierPicker`
- Replace `modifierGroups` / `setModifierGroups` state with `selectedModifierIds` / `setSelectedModifierIds` (string[])
- Add `allModifiers` and `onCreateModifier` to `ProductFormProps`
- In step 3 render `ModifierPicker` instead of `ModifierSelector`
- On submit, call `setProductModifiers(productId, selectedModifierIds)` from repository
- Keep `modifier_groups: []` in the submitted product data (or populate it from selected modifiers for backward compat)
- Update summary to show count of selected modifiers instead of modifier groups

The form needs to load initial selected modifier IDs when editing. Add to props:
```typescript
  allModifiers: MenuModifier[];
  initialModifierIds?: string[];
  onCreateModifier: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
```

**Step 3: Update edit page `src/app/(dashboard)/menu/[id]/page.tsx`**

- Import `useModifiers` hook and `getProductModifierIds`, `setProductModifiers` from repository
- Load product modifier IDs on mount
- Pass `allModifiers`, `initialModifierIds`, and `onCreateModifier` to ProductForm
- In `handleSubmit`: after `updateProduct`, call `setProductModifiers(productId, data.modifierIds)`

**Step 4: Update new page `src/app/(dashboard)/menu/new/page.tsx`**

- Same pattern: import `useModifiers`, pass to form
- In `handleSubmit`: after `createProduct`, call `setProductModifiers(newProduct.id, data.modifierIds)`

**Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/modules/menu/components/modifier-picker.tsx src/modules/menu/components/product-form.tsx src/app/\(dashboard\)/menu/\[id\]/page.tsx src/app/\(dashboard\)/menu/new/page.tsx
git commit -m "feat: replace modifier groups with DB-backed modifier picker in product form"
```

---

### Task 6: Fix Save Button — No Navigation After Save

**Files:**
- Modify: `src/app/(dashboard)/menu/[id]/page.tsx`

**Step 1: Remove `router.push('/menu')` after save**

In `handleSubmit`, change:
```typescript
// Before:
await updateProduct(productId, data);
toast.success('Produkt zostal zaktualizowany');
router.push('/menu');

// After:
await updateProduct(productId, data);
toast.success('Produkt zostal zaktualizowany');
// Stay on edit page — no navigation
```

**Step 2: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/menu/\[id\]/page.tsx
git commit -m "fix: save button in product edit stays on page instead of navigating away"
```

---

### Task 7: POS Modifier Selection Dialog

**Files:**
- Create: `src/modules/orders/components/modifier-selection-dialog.tsx`
- Modify: `src/modules/orders/components/order-form.tsx` — integrate dialog
- Modify: `src/types/order.ts` — simplify `OrderItemModifier` (remove `modifier_group_id`)

**Step 1: Simplify `OrderItemModifier` in `src/types/order.ts`**

```typescript
export interface OrderItemModifier {
  modifier_id: string;
  name: string;
  price: number;
  quantity: number;
  modifier_action: string; // 'add' | 'remove'
}
```

Remove `modifier_group_id` (no longer used). Add `modifier_action` to display properly.

**Step 2: Create `modifier-selection-dialog.tsx`**

File: `src/modules/orders/components/modifier-selection-dialog.tsx`

Props:
```typescript
interface ModifierSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  modifiers: MenuModifier[];
  variant?: ProductVariant | null;
  onConfirm: (selectedModifiers: OrderItemModifier[]) => void;
}
```

UI:
- Dialog title: product name
- List of modifiers with toggles (checkboxes)
- Each modifier row: checkbox, name, price badge (+X PLN or "bezplatnie"), action label
- ADD modifiers show "+" prefix, REMOVE modifiers show "−" prefix
- Footer: "Dodaj do zamowienia" button + cancel
- On confirm: map selected toggles to `OrderItemModifier[]` and call `onConfirm`
- On close/cancel: add product without modifiers

**Step 3: Integrate into `order-form.tsx`**

Update the flow:

1. Add state for modifier dialog:
```typescript
const [modifierDialog, setModifierDialog] = useState<{
  open: boolean;
  product: Product | null;
  variant?: ProductVariant | null;
}>({ open: false, product: null });
```

2. Load modifiers from menu store or from Supabase directly (via `getProductModifiers`).

Since order-form currently loads products from localStorage, we need to also load modifiers from Supabase. Add a state for `productModifiersMap: Record<string, MenuModifier[]>` that caches modifier lists per product.

Alternative simpler approach: load all modifiers once, and use `product_modifiers` junction table. But order-form loads from localStorage for products...

Best approach: load modifiers on-demand when product is clicked. Use `getProductModifiers(productId)` from repository. Cache in a local ref/state.

3. Update `handleProductClick`:
```typescript
const handleProductClick = async (product: Product) => {
  if (product.variants.length > 0) {
    setVariantDialog({ open: true, product });
  } else {
    // Check if product has modifiers
    const modifiers = await getProductModifiers(product.id);
    if (modifiers.length > 0) {
      setModifierDialog({ open: true, product, variant: null });
      setProductModifiers(modifiers); // cache in state
    } else {
      addToCart(product);
    }
  }
};
```

4. Update `handleVariantSelect` similarly:
```typescript
const handleVariantSelect = async (product: Product, variant: ProductVariant) => {
  setVariantDialog({ open: false, product: null });
  const modifiers = await getProductModifiers(product.id);
  if (modifiers.length > 0) {
    setModifierDialog({ open: true, product, variant });
    setProductModifiers(modifiers);
  } else {
    addToCart(product, variant);
  }
};
```

5. Handle modifier dialog confirm:
```typescript
const handleModifierConfirm = (selectedModifiers: OrderItemModifier[]) => {
  const { product, variant } = modifierDialog;
  if (!product) return;
  addToCartWithModifiers(product, variant ?? undefined, selectedModifiers);
  setModifierDialog({ open: false, product: null });
};
```

6. Add `addToCartWithModifiers` to the order store or do it inline by calling `addToCart` then `addModifier` for each.

Better: extend `addToCart` in the store to accept optional modifiers:

In `src/modules/orders/store.ts`, update `addToCart` signature:
```typescript
addToCart: (product: Product, variant?: ProductVariant, quantity?: number, modifiers?: OrderItemModifier[]) => void;
```

And in implementation, when modifiers are passed, include them in the cart item:
```typescript
addToCart: (product, variant, quantity = 1, modifiers = []) => {
  const price = variant?.price ?? product.price;
  const modifiers_price = modifiers.reduce((sum, m) => sum + m.price * m.quantity, 0);

  // Only merge if no modifiers (same as before)
  if (modifiers.length === 0) {
    const existingIndex = state.cart.findIndex(
      (item) =>
        item.product_id === product.id &&
        item.variant_id === (variant?.id ?? undefined) &&
        item.modifiers.length === 0
    );
    if (existingIndex >= 0) {
      // ... existing merge logic
      return;
    }
  }

  const newItem: CartItem = {
    id: crypto.randomUUID(),
    product_id: product.id,
    product_name: product.name,
    variant_id: variant?.id,
    variant_name: variant?.name,
    quantity,
    unit_price: price,
    modifiers,
    modifiers_price,
    total_price: quantity * (price + modifiers_price),
  };
  set({ cart: [...state.cart, newItem] });
};
```

7. Update cart sidebar modifier display to show action prefix:
```typescript
// In cart-sidebar.tsx, change modifier display:
<p className="text-[10px] text-muted-foreground">
  {mod.modifier_action === 'remove' ? '−' : '+'} {mod.name}
  {mod.price > 0 && ` (+${formatCurrency(mod.price)})`}
</p>
```

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/modules/orders/components/modifier-selection-dialog.tsx src/modules/orders/components/order-form.tsx src/modules/orders/store.ts src/types/order.ts src/modules/orders/components/cart-sidebar.tsx
git commit -m "feat: add modifier selection dialog to POS order screen"
```

---

### Task 8: Update Seed Data

**Files:**
- Modify: `src/seed/data/products.ts` — add standalone modifiers seed data
- Modify: `src/seed/index.ts` — seed modifiers collection

**Step 1: Add modifiers seed data to `src/seed/data/products.ts`**

Export a new `modifiers` array and `productModifierLinks` array with deduplicated modifiers extracted from the existing groups. Keep the existing modifier group data for backward compat with localStorage backend.

```typescript
export const MODIFIER_IDS = {
  DODATKOWY_SER: '66666666-6666-6666-6666-666666660001',
  BEKON: '66666666-6666-6666-6666-666666660002',
  JALAPENO: '66666666-6666-6666-6666-666666660003',
  EXTRA_SOS: '66666666-6666-6666-6666-666666660004',
  BBQ: '66666666-6666-6666-6666-666666660005',
  CZOSNKOWY: '66666666-6666-6666-6666-666666660006',
  OSTRY: '66666666-6666-6666-6666-666666660007',
  MAJONEZ: '66666666-6666-6666-6666-666666660008',
  MALY_03L: '66666666-6666-6666-6666-666666660009',
  DUZY_07L: '66666666-6666-6666-6666-666666660010',
} as const;

export const modifiers: MenuModifier[] = [
  { id: MODIFIER_IDS.DODATKOWY_SER, name: 'Dodatkowy ser', price: 3, modifier_action: 'add', ... },
  { id: MODIFIER_IDS.BEKON, name: 'Bekon', price: 5, modifier_action: 'add', ... },
  // ... etc for all unique modifiers
];

export const productModifierLinks = [
  // Cheeseburger gets: ser, bekon, jalapeno, extra sos, bbq, czosnkowy, ostry, majonez
  { product_id: PRODUCT_IDS.CHEESEBURGER, modifier_id: MODIFIER_IDS.DODATKOWY_SER },
  // ... etc
];
```

**Step 2: Update `src/seed/index.ts`**

Add `modifiers` and `product_modifier_links` to seed collections (for localStorage backend):

```typescript
import { products, modifiers, productModifierLinks } from './data/products';

seedCollection('modifiers', modifiers);
seedCollection('product_modifiers', productModifierLinks);
```

**Step 3: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/seed/data/products.ts src/seed/index.ts
git commit -m "feat: add standalone modifiers to seed data"
```

---

### Task 9: Final Build & Verification

**Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Verify migration was applied**

Run: `npx supabase migration list`
Expected: Shows `20260228100001_modifiers_standalone` as applied

**Step 3: Manual smoke test checklist**

- [ ] `/menu/modifiers` page loads, shows migrated modifiers
- [ ] Can create a new modifier
- [ ] Can edit an existing modifier
- [ ] Can delete a modifier
- [ ] `/menu/[id]` (edit product) shows modifier picker with checkboxes
- [ ] Saving product persists modifier assignments (check `product_modifiers` table)
- [ ] Save button stays on edit page (no redirect)
- [ ] POS `/orders/new` — clicking product with modifiers shows selection dialog
- [ ] Selected modifiers appear in cart with correct prices
- [ ] Order submission includes modifiers

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build/runtime issues from modifiers feature"
```
