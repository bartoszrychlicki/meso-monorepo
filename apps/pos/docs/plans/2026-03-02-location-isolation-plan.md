# Plan: Separacja danych per lokalizacja w POS

Data: 2026-03-02

## Cel
Zapewnic, aby przelacznik lokalizacji w POS realnie izolowal dane operacyjne:
- zamowienia
- KDS
- magazyn
- dostawy

oraz utrzymac dane wspolne:
- menu
- receptury
- klienci
- uzytkownicy

## Stan obecny (audyt)

### 1. Przelacznik lokalizacji dziala tylko w UI
- `currentLocation` jest ustawiane w store, ale nie steruje zapytaniami danych.
- Referencje:
  - `apps/pos/src/modules/users/store.ts:138`
  - `apps/pos/src/components/layout/header.tsx:55`

### 2. Zamowienia nie sa separowane wg wybranej lokalizacji
- Lista zamowien pobiera wszystko (`findAll`) bez filtra `location_id`.
- Tworzenie zamowienia z POS ma hardcoded lokalizacje (`FOOD_TRUCK_MOKOTOW`).
- Referencje:
  - `apps/pos/src/modules/orders/store.ts:111`
  - `apps/pos/src/modules/orders/store.ts:165`
  - `apps/pos/src/modules/orders/repository.ts:19`
  - `apps/pos/src/modules/orders/hooks.ts:19`

### 3. KDS nie jest separowany wg lokalizacji
- Aktywne tickety sa pobierane globalnie (tylko po statusie).
- Referencje:
  - `apps/pos/src/modules/kitchen/repository.ts:123`
  - `apps/pos/src/modules/kitchen/store.ts:31`

### 4. Magazyn jest globalny na poziomie widoku i zapytan
- Repozytorium laduje wszystkie magazyny i stany magazynowe.
- UI filtruje tylko po wybranym magazynie (tabs), nie po `currentLocation`.
- Referencje:
  - `apps/pos/src/modules/inventory/repository.ts:52`
  - `apps/pos/src/modules/inventory/repository.ts:79`
  - `apps/pos/src/modules/inventory/store.ts:65`
  - `apps/pos/src/app/(dashboard)/inventory/page.tsx:44`

### 5. Dostawy sa globalne
- `deliveries` sa powiazane z `warehouse_id` (brak `location_id` w tabeli).
- Lista dostaw pobiera wszystko.
- Referencje:
  - `supabase/migrations/20260226100001_add_deliveries.sql:14`
  - `apps/pos/src/modules/deliveries/repository.ts:42`
  - `apps/pos/src/modules/deliveries/store.ts:54`
  - `apps/pos/src/app/(dashboard)/deliveries/page.tsx:26`

### 6. Pracownicy i uzytkownicy
- Pracownicy maja `location_id`, ale lista pracownikow jest globalna i ma reczny filtr po lokalizacji.
- Uzytkownicy maja `location_id`, ale panel admina pobiera wszystkich.
- Referencje:
  - `supabase/migrations/20260225000001_create_tables.sql:295`
  - `apps/pos/src/modules/employees/store.ts:37`
  - `apps/pos/src/modules/employees/components/employee-list.tsx:82`
  - `apps/pos/src/app/admin/users/actions.ts:9`

### 7. Schemat bazy vs egzekwowanie
- Tabele orders i kitchen maja `location_id`.
- Magazyny maja opcjonalne `location_id`.
- RLS dla kluczowych tabel jest obecnie "allow all", wiec baza nie egzekwuje separacji tenantowej.
- Referencje:
  - `supabase/migrations/20260225000001_create_tables.sql:103`
  - `supabase/migrations/20260225000001_create_tables.sql:130`
  - `supabase/migrations/20260226000001_add_warehouses.sql:11`
  - `supabase/migrations/20260225000004_basic_rls.sql:51`

## Klasyfikacja "wspolne vs per lokalizacja" (stan obecny)

- W praktyce wspolne (globalne):
  - menu
  - receptury
  - klienci
  - uzytkownicy
  - zamowienia (mimo pola `location_id`)
  - KDS (mimo pola `location_id`)
  - magazyn (mimo `warehouse.location_id`)
  - dostawy (indirect przez warehouse, ale lista globalna)

- W modelu danych czesciowo per lokalizacja:
  - orders (`location_id`)
  - kitchen tickets (`location_id`)
  - employees (`location_id`)
  - warehouses (`location_id` opcjonalne)

## Plan wdrozenia separacji

1. Kontekst aktywnej lokalizacji
- Jeden zrodlo prawdy: `currentLocation` z `useUserStore`.
- Dodac helper/getter zwracajacy wymagane `currentLocation.id` i blad UI, gdy brak.

2. Zamowienia
- Usunac hardcoded `LOCATION_IDS.FOOD_TRUCK_MOKOTOW`.
- Przy create w POS wpisywac `location_id = currentLocation.id`.
- W `loadOrders`, `loadActiveOrders`, KPI i listach filtrowac po `location_id`.

3. KDS
- Dodac metody repozytorium `getActiveTicketsByLocation(locationId)` i analogiczne dla statystyk.
- Podlaczyc store/hook KDS do aktywnej lokalizacji.

4. Magazyn
- Zdefiniowac zasade biznesowa:
  - wariant A: widac tylko magazyny lokalizacji + globalne (`location_id IS NULL`)
  - wariant B: widac tylko magazyny danej lokalizacji
- Wdrozyc filtrowanie w repo/store i domyslny widok zalezny od `currentLocation`.

5. Dostawy
- Filtrowac dostawy przez magazyny dostepne dla aktywnej lokalizacji.
- W formularzu nowej dostawy pokazywac tylko magazyny tej lokalizacji (wg przyjetej zasady z pkt 4).

6. API
- Dla endpointow zamowien (GET/POST) dodac opcjonalny/obowiazkowy filtr `location_id` zgodny z modelem uprawnien.
- Dla operacji serwerowych ograniczyc zakres do lokalizacji (nie globalnie).

7. RLS i bezpieczenstwo danych
- Zastapic "allow all" politykami opartymi o kontekst uzytkownika/lokalizacji tam, gdzie dane maja byc izolowane.
- Dotyczy minimum: `orders_orders`, `orders_kitchen_tickets`, `inventory_warehouses`, `inventory_warehouse_stock`, `deliveries`, `delivery_items`.

8. Testy
- Dodac testy integracyjne:
  - zmiana lokalizacji zmienia widok listy zamowien/KDS/magazynu/dostaw
  - create order zapisuje poprawne `location_id`
  - brak przeciekow danych miedzy lokalizacjami

## Decyzje do potwierdzenia przed implementacja

1. Czy magazyny globalne (`location_id = NULL`) maja byc widoczne we wszystkich lokalizacjach?
2. Czy pracownicy maja byc finalnie globalni (zgodnie z wymaganiem biznesowym), czy przypisani do lokalizacji jak obecnie w modelu?
3. Czy API publiczne ma wymagac `location_id` dla odczytu list zamowien, czy domyslnie zwracac wszystko (jak dzis)?

## Aktualizacja 2026-03-03 (odkrycia Delivery + remote Supabase)

### 1. Skad Delivery bierze konfiguracje lokalizacji
- Delivery nie bierze oplat z hardcode POS.
- Delivery wybiera lokalizacje z `users_locations`:
  - warunek: `is_active = true`
  - sortowanie: `updated_at DESC`, potem `id ASC`
  - limit: `1`
- Referencje:
  - `apps/delivery/src/hooks/useCheckout.ts:81`
  - `apps/delivery/src/app/(main)/checkout/page.tsx:125`
  - `apps/delivery/src/app/(menu)/page.tsx:44`
  - `apps/delivery/src/app/api/menu/route.ts:52`

### 2. Skad bierze oplaty i progi (np. pay on pickup fee)
- Po wyborze aktywnej lokalizacji Delivery czyta `orders_delivery_config` po `location_id`.
- Z tej tabeli pochodza m.in.: `pay_on_pickup_fee`, `pay_on_pickup_enabled`, `pay_on_pickup_max_order`, `min_order_amount`, `delivery_fee`.
- Referencje:
  - `apps/delivery/src/app/(main)/checkout/page.tsx:135`
  - `apps/delivery/src/app/(menu)/page.tsx:61`
  - `apps/delivery/src/app/api/menu/route.ts:66`

### 3. Fallbacki runtime (gdy brakuje configu)
- Jesli rekord `orders_delivery_config` nie istnieje albo ma puste wartosci, Delivery wpada na defaulty z kodu:
  - `payOnPickupFee = 2`
  - `payOnPickupMaxOrder = 100`
  - `minOrderAmount = 35`
  - `deliveryFee = 7.99`
- Referencja:
  - `apps/delivery/src/lib/location-config.ts:32`

### 4. Wnioski dla funkcjonalnosci multi-placowek
- W praktyce Delivery powinno miec dokladnie jedna aktywna lokalizacje (`users_locations.is_active = true`).
- Przy wielu aktywnych lokalizacjach wynik bylby biznesowo niejednoznaczny; technicznie obecnie jest deterministiczny przez sortowanie.
- Konfiguracja Delivery jest per lokalizacja przez relacje `orders_delivery_config.location_id -> users_locations.id`.

### 5. Co zostalo zrobione migracjami (remote)
- `supabase/migrations/20260303000001_single_active_location.sql`
  - wybiera jedna lokalizacje "keeper",
  - ustawia tylko ja jako aktywna,
  - zapewnia istnienie `orders_delivery_config` dla keepera,
  - ustawia `is_delivery_active = true` tylko dla keepera.
- `supabase/migrations/20260303000002_remove_foreign_beautyapp_artifacts.sql`
  - usuwa obce artefakty DB po omylkowym podpieciu innego projektu Supabase.
- Operacyjnie: migracje w tym repo sa `REMOTE ONLY` (bez lokalnej instancji Supabase).
