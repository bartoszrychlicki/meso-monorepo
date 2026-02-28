# Location Management & Per-Location Settings Design

## Overview

Add location management in Settings: CRUD for locations + per-location configuration (delivery, receipt, KDS) with global defaults fallback.

## Requirements

- Admin: full access (add/remove/edit locations + all settings)
- Manager: edit settings for assigned location only, no add/remove
- Soft delete (deactivate) — preserve history
- Fallback: null in per-location config = use global default from `app_config`
- Delivery frontend must not break (no changes to `orders_delivery_config` structure)

## Data Model

### Existing tables (no changes)

**`users_locations`** — location entity
- id, name, type (`central_kitchen`/`food_truck`/`kiosk`/`restaurant`), address (JSONB), phone, is_active, timestamps

**`orders_delivery_config`** — delivery settings per location (1:1)
- delivery_radius_km, delivery_fee, min_order_amount, estimated_delivery_minutes
- is_delivery_active, opening_time, closing_time
- pickup_time_min/max, pickup_buffer_after_open/before_close
- pay_on_pickup_enabled/fee/max_order

**`app_config`** — global key-value settings (key VARCHAR PK, value JSONB)

### New tables

**`location_receipt_config`** — receipt settings per location (1:1)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | UUID | auto | PK |
| location_id | UUID FK | — | UNIQUE → users_locations, ON DELETE CASCADE |
| receipt_header | TEXT | null | Receipt header (null = global) |
| receipt_footer | TEXT | null | Receipt footer (null = global) |
| print_automatically | BOOLEAN | null | Auto-print on order close |
| show_logo | BOOLEAN | null | Show logo on receipt |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

**`location_kds_config`** — KDS settings per location (1:1)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | UUID | auto | PK |
| location_id | UUID FK | — | UNIQUE → users_locations, ON DELETE CASCADE |
| alert_time_minutes | INTEGER | null | Alert threshold (null = global default 10) |
| auto_accept_orders | BOOLEAN | null | Auto-accept new orders |
| sound_enabled | BOOLEAN | null | Notification sounds |
| display_priority | BOOLEAN | null | Show order priority |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

### New `app_config` entries (global defaults)

| Key | Value (JSONB) |
|-----|---------------|
| `receipt_defaults` | `{"header": "MESO Restaurant\nul. Przykładowa 123\n00-001 Warszawa", "footer": "Dziękujemy za zamówienie!\nZapraszamy ponownie", "print_automatically": true, "show_logo": true}` |
| `kds_defaults` | `{"alert_time_minutes": 10, "auto_accept_orders": false, "sound_enabled": true, "display_priority": true}` |

### Relationships

```
users_locations (1)
  ├── (0..1) orders_delivery_config
  ├── (0..1) location_receipt_config
  └── (0..1) location_kds_config

app_config (global defaults for receipt + KDS)
```

### Fallback logic

```
getLocationSetting(locationId, table, field):
  1. Check per-location config table → if field != null, return it
  2. Check app_config[defaults_key] → return global default
```

No config row = 100% global defaults. Row with null fields = partial override.

## UI Design

### Page structure

```
/settings                        → tabs (Ogólne, Lokalizacje, Wygląd, ...)
/settings?tab=locations          → location list
/settings/locations/new          → add location (full form)
/settings/locations/[id]         → edit location (full form)
```

### Location list (`/settings?tab=locations`)

Table with columns:
- Icon + Name (Building2/Truck/Store icons by type)
- Type (badge)
- Address
- Status (active/inactive badge)
- Actions: "Edytuj" → navigates to `/settings/locations/[id]`

Above table: "+ Dodaj lokalizację" button → `/settings/locations/new`

### Location edit/add page (`/settings/locations/[id]` or `/new`)

Header: "← Powrót do lokalizacji" + location name (or "Nowa lokalizacja")

4 tab sections:

1. **Dane podstawowe** — name, type (select), address fields, phone, is_active switch. Deactivation with confirmation dialog.

2. **Dostawa** — fields from `orders_delivery_config`. "Dostawa aktywna" toggle at top — if OFF, remaining fields disabled/greyed.

3. **Paragony** — fields from `location_receipt_config`. Each field shows placeholder with current global default + hint "Puste = globalne ustawienie".

4. **KDS** — fields from `location_kds_config`. Same placeholder/hint pattern.

"Zapisz" button at bottom.

### Global defaults in Settings > Ogólne tab

New card sections at bottom of Ogólne tab:
- **"Domyślne ustawienia paragonów"** — header, footer, auto-print, logo
- **"Domyślne ustawienia KDS"** — alert time, auto-accept, sound, priority

Current "Paragony" tab content moves into global defaults section.

### Permissions

- Admin: sees all locations, can add/deactivate/edit all settings
- Manager: sees only assigned location, can edit its settings (delivery/receipt/KDS), cannot add/remove locations
