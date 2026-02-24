# Plan integracji: MESOpos <-> meso_delivery

## Context

MESOpos (POS) i meso_delivery (customer-facing delivery app) to dwa osobne systemy na osobnych projektach Supabase. Obecnie nie komunikuja sie ze soba. Cel: delivery app czerpie produkty z POS (source of truth) i zapisuje zamowienia w POS, a klient delivery widzi aktualizacje statusow z kuchni w realtime.

**Decyzje architektoniczne:**
- Dwa osobne projekty Supabase, integracja przez REST API
- POS jest masterem dla produktow/menu
- Hybrid order flow: delivery obsluguje platnosci w swojej DB, po oplaceniu wysyla zamowienie do POS API
- Status updates: POS -> webhook -> delivery API -> delivery DB -> Supabase Realtime -> klient
- Kuchnia wymaga ACCEPTED przed PREPARING (delivery customer widzi to jako "confirmed")
- Obie strony moga anulowac zamowienia

---

## Faza A: POS API - rozszerzenie dla delivery (Meso-pos)

### A1. Rozszerzenie typu Order i schematu

**Plik: `src/types/order.ts`**
- Dodaj do `Order`: `external_order_id?: string`, `external_channel?: string`, `metadata?: Record<string, unknown>`

**Plik: `src/schemas/order.ts`**
- Rozszerz `CreateOrderSchema` o:
  - `external_order_id: z.string().optional()`
  - `external_channel: z.string().optional()`
  - `payment_status: z.nativeEnum(PaymentStatus).optional()` (pozwala na pre-paid)
  - `delivery_address: AddressSchema.optional()` (juz jest w typie, brakuje w schema)
  - `customer_id: z.string().optional()`
  - `metadata: z.record(z.unknown()).optional()`

### A2. Rozszerzenie POST /api/v1/orders

**Plik: `src/app/api/v1/orders/route.ts`**
- Gdy `channel === DELIVERY_APP` i `payment_status === PAID`:
  - Tworz zamowienie ze statusem `CONFIRMED` (nie `PENDING`)
  - Dodaj do status_history: `{ status: CONFIRMED, note: 'Zamowienie z delivery app (oplacone)' }`
  - Zapisz `external_order_id`, `external_channel`, `metadata`
  - Zapisz `delivery_address` z inputu
- Zwroc w response: `id` (pos_order_id), `order_number`

### A3. Rozszerzenie GET /api/v1/menu/products

**Plik: `src/app/api/v1/menu/products/route.ts`**
- Dodaj query param `?channel=delivery` - filtruj produkty ktore maja `pricing[]` z kanalem `delivery`
- Dodaj `?updated_since=ISO_DATE` - filtruj po `updated_at`
- Dodaj `?include=modifiers,variants,pricing` - kontroluj co jest w response

### A4. Nowy endpoint: GET /api/v1/menu/sync-status

**Nowy plik: `src/app/api/v1/menu/sync-status/route.ts`**
- Zwraca: `{ last_updated, product_count, category_count, sync_hash }` (hash SHA-256 z JSON wszystkich produktow)
- Permission: `menu:read`

### A5. Webhook system

**Nowy katalog: `src/lib/webhooks/`**
- `types.ts` - `WebhookPayload`, `WebhookEvent`, `WebhookSubscription`
- `dispatcher.ts` - `sendWebhook(url, payload, secret)` z HMAC-SHA256 podpisem i retry (2 proby, timeout 5s)
- `registry.ts` - zarzadzanie zarejestrowanymi webhookami (localStorage repo)

**Nowy plik: `src/app/api/v1/webhooks/route.ts`**
- `POST` - rejestruj webhook (url, events[], secret) - permission: nowa `webhooks:manage`
- `GET` - lista zarejestrowanych webhookow
- `DELETE` - usun webhook

**Eventy do implementacji:**
- `order.status_changed` - wysylany po `ordersRepository.updateStatus()` gdy `order.channel === DELIVERY_APP`
- `order.cancelled` - jw., gdy nowy status to `CANCELLED`

**Payload `order.status_changed`:**
```json
{
  "id": "unique-delivery-id",
  "event": "order.status_changed",
  "timestamp": "ISO",
  "data": {
    "pos_order_id": "uuid",
    "external_order_id": "42",
    "status": "preparing",
    "previous_status": "accepted",
    "note": "Kuchnia rozpoczela przygotowanie",
    "estimated_ready_at": "ISO"
  }
}
```

**Headers:** `X-POS-Signature` (HMAC-SHA256), `X-POS-Event`, `X-POS-Delivery-Id`

### A6. Dodaj dispatch webhooka do updateStatus

**Plik: `src/modules/orders/repository.ts`**
- W `updateStatus()`: po zapisie, jezeli `order.channel === OrderChannel.DELIVERY_APP`, wywolaj `dispatchWebhook('order.status_changed', ...)`

### A7. CORS dla delivery app

**Plik: `next.config.ts`**
- Dodaj CORS headers dla `/api/v1/*` routes (lub middleware) - `Access-Control-Allow-Origin` z delivery app URL

### A8. Dodaj permission `webhooks:manage`

**Plik: `src/types/api-key.ts`**
- Dodaj `'webhooks:manage'` do `ApiKeyPermission`

---

## Faza B: Delivery - POS client i submission zamowien (meso_delivery)

### B1. Migracja DB - nowe kolumny

**Nowa migracja Supabase:**
```sql
ALTER TABLE orders ADD COLUMN pos_order_id TEXT;
ALTER TABLE orders ADD COLUMN pos_sync_status TEXT DEFAULT NULL
  CHECK (pos_sync_status IN ('pending', 'submitted', 'failed'));

ALTER TABLE products ADD COLUMN pos_product_id TEXT;
ALTER TABLE categories ADD COLUMN pos_category_id TEXT;
ALTER TABLE addons ADD COLUMN pos_modifier_id TEXT;
ALTER TABLE product_variants ADD COLUMN pos_variant_id TEXT;
```

### B2. Tabela retry queue

```sql
CREATE TABLE pos_submission_queue (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### B3. POS API client

**Nowy plik: `src/lib/pos-client.ts`**
```typescript
class PosClient {
  constructor(baseUrl: string, apiKey: string)
  submitOrder(order: MappedPosOrder): Promise<{ pos_order_id: string; order_number: string }>
  cancelOrder(posOrderId: string, reason?: string): Promise<void>
  fetchProducts(params?: { channel?: string; updated_since?: string }): Promise<PosProduct[]>
  fetchCategories(): Promise<PosCategory[]>
  fetchSyncStatus(): Promise<{ sync_hash: string; last_updated: string }>
}
```
- Auth: `X-API-Key` header
- Error handling: throw typed errors (PosApiError, PosUnavailableError)

### B4. Order mapper (delivery -> POS)

**Nowy plik: `src/lib/pos-sync/order-mapper.ts`**

Mapowanie:
| Delivery | POS | Logika |
|----------|-----|--------|
| `id` | `external_order_id` | delivery order id jako string |
| `delivery_type` | `source` | `delivery` -> `delivery`, `pickup` -> `takeaway` |
| (hardcoded) | `channel` | `delivery_app` |
| `location_id` | `location_id` | wymaga mapowania ID miedzy systemami |
| `contact_phone` | `customer_phone` | direct |
| `delivery_address` (JSONB) | `delivery_address` | `{street: "${street} ${building} ${apt}", city, postal_code, country: "PL"}` |
| `items[]` | `items[]` | patrz nizej |
| `promo_discount` | `discount` | direct |
| `payment_method` | `payment_method` | `blik`->`blik`, `card`->`card` |
| (hardcoded) | `payment_status` | `paid` |
| `delivery_fee`, `tip`, `promo_code`, `loyalty_points_earned` | `metadata` | JSONB metadata |
| `notes` | `notes` | direct |

**Item mapping:**
| Delivery | POS |
|----------|-----|
| `product_id` | `product_id` (via `pos_product_id` lookup) |
| `quantity` | `quantity` |
| `unit_price` | `unit_price` |
| product name (lookup) | `product_name` |
| `variant_id` | `variant_id` (via `pos_variant_id` lookup) |
| `variant_name` | `variant_name` |
| `addons[]` | `modifiers[]` (map: `{modifier_id: pos_modifier_id, modifier_group_id: lookup, name, price, quantity: 1}`) |
| `spice_level` | `notes` (dopisz "Ostrosc: X/3") lub jako modifier |
| `notes` | `notes` |

### B5. Modyfikacja P24 webhook handlera

**Plik: `src/app/api/payments/p24/status/route.ts`**
- Po obecnej logice (update order status=confirmed, payment=paid):
  1. Zbuduj mapped order: `mapDeliveryOrderToPOS(order, orderItems)`
  2. Wywolaj `posClient.submitOrder(mappedOrder)`
  3. Success: zapisz `pos_order_id` i `pos_sync_status = 'submitted'` w delivery DB
  4. Failure: zapisz `pos_sync_status = 'pending'`, insert do `pos_submission_queue` z `next_retry_at = now + 30s`

### B6. Cron: retry POS submissions

**Nowy plik: `src/app/api/cron/retry-pos/route.ts`**
- Vercel Cron (co 30s lub co 1min)
- Pobierz z `pos_submission_queue` wpisy gdzie `next_retry_at <= now` i `attempts < max_attempts`
- Dla kazdego: sprobuj `posClient.submitOrder()`, update attempts, exponential backoff (30s, 2min, 10min, 30min, 1h)
- Po 5 nieudanych: `pos_sync_status = 'failed'`, alert w operator panel

### B7. Anulowanie zamowien z delivery

**Nowy plik: `src/app/api/orders/[id]/cancel/route.ts`** (lub rozszerzenie istniejacego)
- Sprawdz czy zamowienie ma `pos_order_id`
- Jezeli tak: wywolaj POS API `PATCH /orders/:pos_order_id/status { status: cancelled }`
- Update delivery DB: `status = cancelled`

---

## Faza C: Status updates POS -> Delivery (webhooks)

### C1. Webhook receiver w delivery

**Nowy plik: `src/app/api/webhooks/pos/route.ts`**
1. Zweryfikuj `X-POS-Signature` (HMAC-SHA256)
2. Sprawdz idempotentnosc: `X-POS-Delivery-Id` vs tabela `webhook_deliveries`
3. Parsuj event type z `X-POS-Event`
4. Dla `order.status_changed`:
   - Znajdz delivery order po `external_order_id`
   - Mapuj POS status -> delivery status:
     - `accepted` -> (nie zmienaj - klient widzi nadal "confirmed")
     - `preparing` -> `preparing`
     - `ready` -> `ready`
     - `out_for_delivery` -> `in_delivery`
     - `delivered` -> `delivered`
     - `cancelled` -> `cancelled`
   - Update w Supabase: `orders.status`, odpowiedni timestamp (`preparing_at`, `ready_at`, etc.)
   - Klient delivery dostanie update przez Supabase Realtime (juz dziala)
5. Zwroc `200 OK` natychmiast

### C2. Status mapping - tabela referencyjna

```
POS status        -> Delivery status     -> Klient widzi
confirmed            confirmed              "Zamowienie przyjete"
accepted             (brak zmiany)          "Zamowienie przyjete" (kuchnia przyjela)
preparing            preparing              "Przygotowujemy Twoj posilek"
ready                ready                  "Zamowienie gotowe!"
out_for_delivery     in_delivery            "Kurier w drodze!"
delivered            delivered              "Smacznego!"
cancelled            cancelled              "Zamowienie anulowane"
```

---

## Faza D: Menu sync POS -> Delivery

### D1. Product mapper (POS -> delivery)

**Nowy plik: `src/lib/pos-sync/product-mapper.ts`**

Mapowanie:
| POS | Delivery | Logika |
|-----|----------|--------|
| `id` | `pos_product_id` | reference ID |
| `name` | `name` | direct |
| `slug` | `slug` | direct |
| `description` | `description` | direct |
| `pricing[channel=DELIVERY].price` | `price` | extract delivery price; fallback `product.price` |
| `images[0].url` | `image_url` | first image |
| `preparation_time_minutes` | `prep_time_min`/`prep_time_max` | `min=value`, `max=value+5` |
| `nutritional_info.calories` | `calories` | direct |
| `allergens[]` | `allergens[]` | map enum keys (rozszerz delivery o brakujace 6 alergenow) |
| `is_available && is_active` | `is_active` | AND |
| `category_id` | `category_id` | via pos_category_id lookup |
| `variants[]` | `product_variants` rows | `price_modifier = variant.price - product.delivery_price` |
| `modifier_groups[].modifiers[]` (action=ADD) | `addons` rows + `product_addons` | tylko ADD modifiers jako addons |
| `sort_order` | `sort_order` | direct |

**Category mapping** - proste 1:1 (name, slug, icon, sort_order, is_active).

### D2. Sync service

**Nowy plik: `src/lib/pos-sync/sync-service.ts`**
1. `syncMenu()`:
   - Fetch `GET /api/v1/menu/sync-status` -> porownaj `sync_hash` z zapisanym
   - Jezeli rozne: fetch categories + products z POS API
   - Transform przez mappery
   - Upsert do delivery Supabase (ON CONFLICT pos_product_id, pos_category_id)
   - Zapisz nowy sync_hash i timestamp

2. `syncSingleProduct(posProductId)`:
   - Fetch `GET /api/v1/menu/products/:id` z POS
   - Transform i upsert

### D3. Cron: periodic menu sync

**Nowy plik: `src/app/api/cron/sync-menu/route.ts`**
- Vercel Cron (co 15 minut)
- Wywolaj `syncMenu()`
- Log wynik (ile dodano, zaktualizowano, dezaktywowano)

### D4. Rozszerzenie delivery alergenow

**Plik: `src/types/menu.ts` (delivery)**
- Dodaj brakujace 6 alergenow EU: peanuts, nuts, mustard, sulphites, lupin, molluscs

---

## Faza E: Error handling i hardening

### E1. Price discrepancy
- POS w POST /orders waliduje ceny z aktualnego katalogu
- Jezeli roznica > 5%: zwroc `422 PRICE_MISMATCH` z detalami
- Delivery decyduje: retry z nowymi cenami lub alert do operatora

### E2. POS downtime resilience
- Retry queue z exponential backoff (Faza B6)
- Klient delivery widzi "Zamowienie przyjete" (bo platnosc przeszla) nawet gdy POS nie odpowiada
- Operator delivery widzi `pos_sync_status = 'pending'` / `'failed'`

### E3. Idempotentnosc
- Delivery wysyla `external_order_id` do POS
- POS sprawdza czy zamowienie z tym `external_order_id` juz istnieje przed tworzeniem
- Webhook receiver sprawdza `delivery_id` w tabeli `webhook_deliveries`

### E4. Konfiguracja env vars

**POS (Meso-pos):**
```
DELIVERY_WEBHOOK_URL=https://meso-delivery.vercel.app/api/webhooks/pos
DELIVERY_WEBHOOK_SECRET=shared_secret_here
```

**Delivery (meso_delivery):**
```
POS_API_URL=https://meso-pos.vercel.app/api/v1
POS_API_KEY=meso_k1_...
POS_WEBHOOK_SECRET=shared_secret_here
```

---

## Sequence diagram: Order flow (happy path)

```
Customer -> Delivery: Place order + pay
Delivery -> Delivery DB: INSERT order (pending_payment)
Delivery -> P24: Register payment
Customer -> P24: Pay
P24 -> Delivery API: Webhook (payment OK)
Delivery -> Delivery DB: UPDATE status=confirmed, payment=paid
Delivery -> POS API: POST /orders {channel: delivery_app, payment_status: paid}
POS -> POS DB: CREATE order (status: CONFIRMED)
POS -> Delivery: 201 {pos_order_id, order_number}
Delivery -> Delivery DB: UPDATE pos_order_id, pos_sync_status=submitted
Kitchen -> POS: ACCEPTED
POS -> Delivery webhook: {status: accepted} (delivery ignores - keeps "confirmed" for customer)
Kitchen -> POS: PREPARING
POS -> Delivery webhook: {status: preparing}
Delivery -> Delivery DB: UPDATE status=preparing
Delivery DB -> Customer: Supabase Realtime ("Przygotowujemy Twoj posilek")
Kitchen -> POS: READY
POS -> Delivery webhook: {status: ready}
Delivery -> Delivery DB: UPDATE status=ready
Delivery DB -> Customer: Supabase Realtime ("Zamowienie gotowe!")
Courier -> POS: OUT_FOR_DELIVERY
POS -> Delivery webhook: {status: out_for_delivery}
Delivery -> Delivery DB: UPDATE status=in_delivery
Delivery DB -> Customer: Supabase Realtime ("Kurier w drodze!")
Courier -> POS: DELIVERED
POS -> Delivery webhook: {status: delivered}
Delivery -> Delivery DB: UPDATE status=delivered
Delivery DB -> Customer: Supabase Realtime ("Smacznego!")
```

---

## Kolejnosc implementacji

1. **Faza A** (POS-side) - rozszerzenie API
2. **Faza B** (Delivery-side) - POS client + order submission
3. **Faza C** (Both) - webhooks dla status updates
4. **Faza D** (Both) - menu sync
5. **Faza E** (Both) - hardening, error handling, idempotentnosc

---

## Krytyczne pliki do modyfikacji

### POS (Meso-pos):
- `src/types/order.ts` - dodaj external_order_id, external_channel, metadata
- `src/schemas/order.ts` - rozszerz CreateOrderSchema
- `src/app/api/v1/orders/route.ts` - obsluz delivery channel z pre-paid
- `src/app/api/v1/orders/[id]/status/route.ts` - po updateStatus dispatch webhook
- `src/modules/orders/repository.ts` - dodaj dispatch webhook w updateStatus
- `src/app/api/v1/menu/products/route.ts` - dodaj ?channel, ?updated_since
- `src/types/api-key.ts` - dodaj webhooks:manage permission
- `src/lib/webhooks/` (nowy) - dispatcher, registry, types
- `src/app/api/v1/webhooks/route.ts` (nowy)
- `src/app/api/v1/menu/sync-status/route.ts` (nowy)

### Delivery (meso_delivery):
- `supabase/migrations/` - nowa migracja (pos_order_id, pos_sync_status, pos_*_id kolumny, queue tables)
- `src/lib/pos-client.ts` (nowy) - POS API client
- `src/lib/pos-sync/order-mapper.ts` (nowy)
- `src/lib/pos-sync/product-mapper.ts` (nowy)
- `src/lib/pos-sync/sync-service.ts` (nowy)
- `src/app/api/payments/p24/status/route.ts` - dodaj POS submission po platnosci
- `src/app/api/webhooks/pos/route.ts` (nowy) - webhook receiver
- `src/app/api/cron/retry-pos/route.ts` (nowy)
- `src/app/api/cron/sync-menu/route.ts` (nowy)
- `src/types/menu.ts` - rozszerz alergeny o 6 brakujacych EU

---

## Weryfikacja

1. **POS API test**: curl POST /api/v1/orders z channel=delivery_app, payment_status=paid - zamowienie powinno byc CONFIRMED
2. **E2E order flow**: Zlosc zamowienie w delivery, oplac (sandbox P24), sprawdz czy pojawia sie w POS KDS
3. **Webhook test**: Zmien status w POS KDS, sprawdz czy delivery DB ma nowy status, sprawdz Supabase Realtime
4. **Menu sync test**: Zmien produkt w POS, odczekaj 15min (lub trigger reczny), sprawdz delivery menu
5. **POS downtime test**: Zablokuj POS API, oplac zamowienie, sprawdz retry queue, odblokuj, sprawdz czy zamowienie trafia do POS
6. **Anulowanie test**: Anuluj zamowienie z delivery -> sprawdz POS. Anuluj z POS -> sprawdz delivery.
7. **Idempotentnosc test**: Wyslij to samo zamowienie 2x do POS -> powinno byc tylko 1 zamowienie
