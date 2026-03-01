# Deliveries (Przyjecia magazynowe) - Design

## Goal

Add a "Deliveries" tab to inventory that lets warehouse staff receive incoming goods quickly - primarily via AI document scanning, with manual fallback. Prioritized for speed of use (dirty hands, courier waiting).

## User & Context

- **Primary user:** Shift manager / warehouse person, little time, physical environment
- **Suppliers:** 3-10 regular suppliers
- **Documents:** Usually VAT invoices (with prices), sometimes WZ delivery notes (no prices)
- **Existing process:** None - new business, designing from scratch

## Core Flow

### Happy path (~30 seconds)

1. User clicks "Nowa dostawa"
2. Selects target warehouse (auto-selected if only one)
3. Takes photo / uploads delivery document image
4. AI extracts: line items (name, quantity, unit, price, VAT, expiry), document number, date, supplier name
5. Backend matches extracted names to existing `stock_items` via fuzzy string matching
6. Screen shows match table: `[document name] -> [suggested stock item]` with confidence badge
7. User reviews, corrects if needed, confirms
8. Click "Przyjmij dostawe" -> stock levels increase, delivery saved

### Manual fallback

Same Excel-like table but filled by hand:
- Always one empty row at bottom
- Type in "Product" -> type-ahead dropdown with filtering, Enter selects
- Tab moves: Product -> Quantity -> Price -> Notes -> **Tab creates new row**
- Price pre-filled from `cost_per_unit` on stock item (editable)
- Empty rows ignored on save
- X button to delete rows

**One table component** serves both scenarios - AI fills it automatically, user fills it manually. No separate UIs.

### After AI scan

Same table, pre-filled by AI. User can:
- Accept high-confidence matches (click)
- Fix unrecognized items (dropdown select or skip)
- Edit quantities/prices inline (Excel-like)
- Add missing rows with Tab
- Delete wrong rows with X

## Optional Fields (visible but not required)

All can be filled during creation or edited later (post-factum):

- Supplier (AI attempts to match from list)
- Document number (AI extracts if present)
- Document date
- Unit prices per item (AI extracts from invoices, empty for WZ)
- Notes (per delivery and per item)

## Data Model

### Delivery

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | auto | |
| delivery_number | string | auto | Format: "PZ {n}/{year}" |
| warehouse_id | UUID | yes | Target warehouse |
| supplier_id | UUID | no | FK to Supplier |
| document_number | string | no | External invoice number |
| document_date | string | no | Date on invoice |
| source | enum | yes | 'ai_scan' \| 'manual' |
| source_image_url | string | no | Photo of document |
| notes | string | no | |
| status | enum | yes | 'draft' \| 'completed' |
| created_at | timestamp | auto | |
| updated_at | timestamp | auto | |

### DeliveryItem

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | auto | |
| delivery_id | UUID | yes | FK to Delivery |
| stock_item_id | UUID | yes | FK to StockItem |
| quantity_ordered | number | no | How much was ordered |
| quantity_received | number | yes | How much accepted to stock |
| unit_price_net | number | no | Price from invoice |
| vat_rate | VatRate | no | VAT rate |
| expiry_date | string | no | Based on shelf_life_days, editable |
| ai_matched_name | string | no | Original name from document |
| ai_confidence | number | no | 0-1 match confidence |
| notes | string | no | E.g. "5kg rejected - bad quality" |

### Supplier (new entity)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | auto | |
| name | string | yes | |
| phone | string | no | |
| email | string | no | |
| notes | string | no | |
| is_active | boolean | yes | Default: true |
| created_at | timestamp | auto | |
| updated_at | timestamp | auto | |

## Delivery List View

Table columns: Nr dostawy, Dostawca, Magazyn, Pozycji, Suma netto, Data, Zrodlo (AI scan / Reczna)

Filters:
- Supplier (dropdown)
- Date range

Click row -> opens delivery detail with edit capability (fill optional fields post-factum).

## AI Matching Technical Design

1. Image sent to `POST /api/v1/deliveries/scan`
2. Backend sends to GPT-4o Vision with structured output prompt
3. Prompt instructs: extract line items (name, quantity, unit, net price, VAT rate, expiry), document number, document date, supplier name
4. Handles both invoices (with prices) and WZ notes (without prices)
5. Backend matches extracted names to stock_items:
   - Fuzzy string match (Levenshtein) on `name` and `sku`
   - Exact SKU match = 100% confidence
   - Threshold: >= 70% shown as suggestion, < 70% marked as unrecognized
6. Supplier name matched to existing suppliers (same fuzzy approach)
7. Returns structured response for frontend to render in confirmation table

## Business Logic

- **Draft** status: delivery created but not confirmed, stock levels unchanged
- **Completed** status: after "Przyjmij dostawe" click, stock levels increase by `quantity_received` per item
- Completed is final (no reversal on MVP - use stock adjustments to correct)
- Delivery number auto-incremented per year: PZ 1/2026, PZ 2/2026, ...

## Explicitly Out of Scope

- PW (internal receipts) - existing stock adjustments and transfers cover this
- Payment status, payment terms, payment methods - not warehouse staff's concern
- Templates
- Package quantity / unit conversion (quantity_in_package)
- Price difference tracking / previous price display
- Delivery reversal/withdrawal
- Batch tracking / FEFO
- Purchase orders / order-to-supplier workflow

## New API Permissions

- `deliveries:read` - read deliveries
- `deliveries:write` - create/edit deliveries
