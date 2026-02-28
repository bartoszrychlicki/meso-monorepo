# Modifiers Persistence & POS Integration Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

Modifiers are currently stored as JSONB inside `menu_products.modifier_groups`. Each product has its own copy — no reuse across products, no central management, no recipe linking for cost/inventory.

## Changes

### 1. Data Model

**New table `public.menu_modifiers`:**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto-generated |
| name | TEXT NOT NULL | e.g. "Dodatkowy ser" |
| price | NUMERIC(10,2) DEFAULT 0 | Price adjustment (0 = free) |
| modifier_action | TEXT NOT NULL DEFAULT 'add' | 'add' or 'remove' |
| recipe_id | UUID NULL | Optional FK to recipes for cost/inventory |
| is_available | BOOLEAN DEFAULT true | Active toggle |
| sort_order | INT DEFAULT 0 | Display order |
| created_at / updated_at | TIMESTAMPTZ | Standard timestamps |

**New junction table `public.product_modifiers`:**

| Column | Type | Description |
|--------|------|-------------|
| product_id | UUID FK | References menu_products |
| modifier_id | UUID FK | References menu_modifiers |
| PK | (product_id, modifier_id) | Composite |

One modifier can be shared across many products. Changing price/name propagates everywhere.

### 2. Migration: Existing JSONB Data

A migration will:
1. Extract all unique modifiers from `menu_products.modifier_groups` JSONB
2. Deduplicate by (name, price, modifier_action) — same combo = same modifier
3. Insert into `menu_modifiers`
4. Create `product_modifiers` links
5. Keep `modifier_groups` JSONB column for now (backward compat) but new code uses relations

### 3. UI: Modifiers Management Page

New page at `/menu/modifiers`:
- List all modifiers with search
- Create/edit via modal (name, price, action ADD/REMOVE, recipe select, availability)
- Shows how many products use each modifier
- Accessible from sidebar under "Menu" section or from menu page tabs

### 4. UI: Product Form — Modifier Assignment

Step "Modyfikatory" in ProductForm:
- Search/filter list of all modifiers from DB
- Checkbox to assign/unassign modifiers to this product
- "Stworz nowy" button opens the same create modal as management page
- Flat list (no groups) — simplified from current group-based UI

### 5. UI: POS Order Screen — Modifier Selection

When a product with modifiers is clicked on POS:
- After variant selection (or immediately if no variants), show modifier dialog
- List of assigned modifiers with toggle
- Each shows: name, price (+X PLN or "bezplatnie"), action badge (ADD/REMOVE)
- "Dodaj do zamowienia" button at bottom
- All modifiers are optional — can add product without any

### 6. Save Button Behavior Change

Edit product page (`/menu/[id]/page.tsx`):
- Remove `router.push('/menu')` after successful save
- Show toast "Zapisano" confirmation
- User stays on edit form

### 7. Seed Data Update

Update `src/seed/data/products.ts`:
- Extract unique modifiers into seed for `menu_modifiers` table
- Create `product_modifiers` associations
- Keep JSONB for backward compat during transition

## Files to Create/Modify

**New files:**
- `supabase/migrations/YYYYMMDD_modifiers_table.sql` — DDL + data migration
- `src/app/(dashboard)/menu/modifiers/page.tsx` — management page
- `src/modules/menu/components/modifier-management.tsx` — CRUD list component
- `src/modules/menu/components/modifier-form-dialog.tsx` — create/edit modal
- `src/modules/menu/components/modifier-picker.tsx` — for product form assignment
- `src/modules/menu/components/modifier-selection-dialog.tsx` — POS order dialog

**Modified files:**
- `src/types/menu.ts` — add Modifier entity type, simplify from groups
- `src/schemas/menu.ts` — add ModifierSchema for DB entity
- `src/modules/menu/store.ts` — add modifier CRUD actions, loadModifiers
- `src/modules/menu/repository.ts` — add modifiers repository
- `src/modules/menu/hooks.ts` — add useModifiers hook
- `src/modules/menu/components/product-form.tsx` — replace ModifierSelector with ModifierPicker
- `src/app/(dashboard)/menu/[id]/page.tsx` — remove redirect on save
- `src/app/(dashboard)/menu/new/page.tsx` — remove redirect on save (if same pattern)
- `src/modules/orders/components/order-form.tsx` — add modifier selection dialog
- `src/modules/orders/store.ts` — ensure cart handles flat modifiers
- `src/components/layout/app-sidebar.tsx` — add Modifiers nav item (or submenu)
- `src/seed/data/products.ts` — update seed data
- `src/types/order.ts` — simplify OrderItemModifier (remove group_id)

## Out of Scope

- Modifier groups (simplified to flat modifiers for now)
- Recipe assignment during this migration (no existing modifiers have recipes)
- Inventory deduction on modifier recipe (data model supports it, logic comes later)
