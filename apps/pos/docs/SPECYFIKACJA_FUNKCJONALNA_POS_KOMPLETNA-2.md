# SPECYFIKACJA FUNKCJONALNA SYSTEMU POS
## Dla Sieci Gastronomicznej z Kuchnią Centralną i Mobilnymi Punktami Sprzedaży

**Wersja:** 1.0  
**Data:** 2024  
**Status:** Dokument wdrożeniowy

---

## SPIS TREŚCI

1. [Wstęp i Kontekst Biznesowy](#1-wstęp-i-kontekst-biznesowy)
2. [Architektura Systemu](#2-architektura-systemu)
3. [Moduł Zarządzania Menu](#3-moduł-zarządzania-menu)
4. [Moduł Receptur i Składników](#4-moduł-receptur-i-składników)
5. [Moduł Magazynowy](#5-moduł-magazynowy)
6. [Moduł Obsługi Zamówień i KDS](#6-moduł-obsługi-zamówień-i-kds)
7. [Moduł CRM i Program Lojalnościowy](#7-moduł-crm-i-program-lojalnościowy)
8. [Moduł Raportowania i Dashboardy](#8-moduł-raportowania-i-dashboardy)
9. [Moduł Ludzie (Pracownicy)](#9-moduł-ludzie-pracownicy)
10. [Integracje](#10-integracje)
11. [Innowacje i AI](#11-innowacje-i-ai)
12. [Priorytety Wdrożenia](#12-priorytety-wdrożenia)
13. [Wykaz Funkcji](#13-wykaz-funkcji)

---

## 1. WSTĘP I KONTEKST BIZNESOWY

### 1.1 Opis Biznesowy

System POS jest budowany dla sieci gastronomicznej opartej na modelu **Kuchnia Centralna (KC) + Mobilne Punkty Sprzedaży**. Jest to system własny (nie komercyjny), zaprojektowany z myślą o prostocie obsługi, gotowości na rozwój oraz innowacyjności (AI).

### 1.2 Model Biznesowy

```
┌─────────────────────────────────────────────────────────────────┐
│                    KUCHNIA CENTRALNA (KC)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ MAGAZYN      │  │ PRODUKCJA    │  │ MAGAZYN PÓŁPRODUKTÓW │   │
│  │ SUROWCÓW     │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  PUNKT #1       │  │  PUNKT #2       │  │  PUNKT #N       │
│  (Food Truck)   │  │  (Lokal)        │  │  (Kiosk)        │
│  + KDS          │  │  + KDS          │  │  + KDS          │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              APLIKACJA MOBILNA KLIENTA                           │
│         (Zamawianie, śledzenie, płatności)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Kanały Sprzedaży

| Kanał | Opis | Priorytet |
|-------|------|-----------|
| **Delivery** | Dostawa do klienta | Wysoki |
| **Odbiór na miejscu** | Pickup z punktu | Wysoki |
| **Własna aplikacja** | Model Uber Eats | Wysoki |
| **Lokal (przyszłość)** | Mały lokal z miejscami | Średni |

### 1.4 Cele Systemu

1. **Efektywność operacyjna** - automatyzacja procesów KC i punktów
2. **Kontrola kosztów** - śledzenie food costów, zapasów, strat
3. **Satysfakcja klienta** - szybka obsługa, personalizacja, lojalność
4. **Skalowalność** - łatwe dodawanie nowych punktów
5. **Innowacyjność** - wdrożenie AI dla przewagi konkurencyjnej

### 1.5 Słownik Pojęć

| Pojęcie | Definicja |
|---------|-----------|
| **POS** | Point of Sale - system obsługi punktu sprzedaży |
| **KDS** | Kitchen Display System - ekrany kuchenne |
| **KC** | Kuchnia Centralna |
| **BOM** | Bill of Materials - receptura, lista składników |
| **FEFO** | First Expired First Out - rotacja zapasów |
| **RFM** | Recency, Frequency, Monetary - analiza klientów |
| **SKU** | Stock Keeping Unit - unikalny kod produktu |

---

## 2. ARCHITEKTURA SYSTEMU

### 2.1 Rekomendacja: Modular Monolith

Dla małego zespołu (2-5 developerów) zdecydowanie rekomendujemy podejście **Modular Monolith** zamiast mikroserwisów.

| Aspekt | Mikroserwisy | Modularyzowany Monolit |
|--------|--------------|------------------------|
| Złożoność operacyjna | Wysoka | Niska |
| Debugging | Trudny | Prosty |
| Deployment | Złożony | Prosty |
| Baza danych | Rozproszona | Wspólna (ACID) |
| Koszt DevOps | Wysoki | Niski |
| Zespół wymagany | 8+ osób | 2-5 osób |

### 2.2 Podział na Moduły

| Moduł | Odpowiedzialność | Kluczowe Encje |
|-------|------------------|----------------|
| **MenuModule** | Produkty, kategorie, ceny, dostępność | Product, Category, Modifier |
| **OrderModule** | Zamówienia, pozycje, statusy | Order, OrderItem, OrderStatusHistory |
| **PaymentModule** | Płatności, transakcje, zwroty | Payment, Transaction, Refund |
| **KitchenModule** | Kolejka kuchenna, czas przygotowania | KitchenQueue, PreparationTime |
| **InventoryModule** | Magazyn, stany, spis, alerty | StockItem, StockMovement, Supplier |
| **UserModule** | Użytkownicy, role, uprawnienia | User, Role, Permission, Location |
| **CRMModule** | Klienci, lojalność, komunikacja | Customer, LoyaltyTransaction, Coupon |
| **ReportingModule** | Raporty, analizy, dashboardy | Report, Metric, Dashboard |
| **IntegrationModule** | Integracje zewnętrzne, webhooki | ApiKey, Webhook, IntegrationLog |

### 2.3 Stack Technologiczny

#### Backend & Frontend (Full Stack)
| Komponent | Technologia | Uzasadnienie |
|-----------|-------------|--------------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React, API Routes, SSR |
| **Język** | TypeScript 5+ | Type safety, lepszy DX |
| **Runtime** | Node.js 20+ | LTS, wydajność |
| **API** | Next.js API Routes + tRPC | Type-safe API, auto-kompletowanie |
| **ORM** | Prisma 5+ | Type-safe queries, migrations |
| **Walidacja** | Zod | Schema validation, TypeScript inference |
| **Task Queue** | BullMQ + Redis | Proven solution, wsparcie dla jobów |
| **Real-time** | Supabase Realtime | WebSockety, broadcast |

#### Frontend
| Komponent | Technologia |
|-----------|-------------|
| **Framework** | Next.js 14+ (App Router) |
| **State** | Zustand + TanStack Query |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Forms** | React Hook Form + Zod |
| **Build** | Next.js built-in |

#### Baza Danych i Backend-as-a-Service
| Komponent | Technologia | Opis |
|-----------|-------------|------|
| **Primary DB** | Supabase PostgreSQL | Managed PostgreSQL + Realtime |
| **Auth** | Supabase Auth | JWT, OAuth, Row Level Security |
| **Storage** | Supabase Storage | Pliki, obrazy |
| **Cache** | Redis 7+ (Upstash) | Serverless Redis |
| **Hosting** | Vercel | Optymalny dla Next.js |
| **CDN** | Vercel Edge Network | Globalne cache'owanie |

### 2.4 Baza Danych (Supabase)

#### Struktura Schematów

```sql
-- Supabase PostgreSQL z Row Level Security (RLS)
CREATE SCHEMA menu;
CREATE SCHEMA orders;
CREATE SCHEMA payments;
CREATE SCHEMA inventory;
CREATE SCHEMA users;
CREATE SCHEMA crm;
CREATE SCHEMA reports;
CREATE SCHEMA employees;  -- NOWY: moduł pracowników
```

#### Kluczowe Funkcje Supabase

| Funkcja | Zastosowanie |
|---------|--------------|
| **Row Level Security (RLS)** | Bezpieczeństwo na poziomie wiersza |
| **Realtime** | Subskrypcje zmian w bazie (WebSocket) |
| **Auth** | Autentykacja użytkowników |
| **Storage** | Przechowywanie zdjęć produktów |
| **Edge Functions** | Serverless functions (opcjonalnie) |

### 2.5 Komunikacja Między Modułami

- **Wewnętrzna (synchroniczna)** - tRPC procedures, Server Actions
- **Zewnętrzna (asynchroniczna)** - Supabase Realtime, Redis Pub/Sub

---

## 2.6 WYMAGANIA AI-FRIENDLY (Dla Autonomicznych Agentów)

### Cel
System musi być zaprojektowany tak, aby autonomiczne agenty AI mogły w łatwy sposób:
- Odczytywać stan interfejsu z HTML (semantic markup)
- Nawigować po aplikacji przez przeglądarkę
- Wykonywać operacje (klikać, wypełniać formularze)
- Odczytywać dane przez API

### Wymagania Techniczne

#### 1. Semantic HTML5

```html
<!-- ✅ DOBRY PRZYKŁAD - czytelny dla AI -->
<main data-page="dashboard">
  <header>
    <h1>Dashboard Kierownika</h1>
    <nav aria-label="Główna nawigacja">
      <a href="/orders" data-nav="orders">Zamówienia</a>
      <a href="/inventory" data-nav="inventory">Magazyn</a>
    </nav>
  </header>

  <section data-section="daily-summary" aria-labelledby="summary-heading">
    <h2 id="summary-heading">Podsumowanie dnia</h2>
    <dl>
      <dt>Przychód</dt>
      <dd data-metric="revenue" data-value="8500">8 500 PLN</dd>
      <dt>Zamówienia</dt>
      <dd data-metric="orders" data-value="210">210</dd>
    </dl>
  </section>
</main>

<!-- ❌ ZŁY PRZYKŁAD - trudny dla AI -->
<div class="wrapper">
  <div class="top">
    <div class="title">Dashboard</div>
    <div class="nav">
      <div class="link">Zamówienia</div>
      <div class="link">Magazyn</div>
    </div>
  </div>
  <div class="content">
    <div class="header">Podsumowanie</div>
    <div class="stats">
      <div class="stat">
        <div class="label">Przychód</div>
        <div class="value">8 500 PLN</div>
      </div>
    </div>
  </div>
</div>
```

#### 2. Atrybuty Data-* dla Identyfikacji

Każdy kluczowy element musi mieć atrybuty `data-*`:

| Element | Atrybut | Przykład |
|---------|---------|----------|
| Przycisk akcji | `data-action` | `data-action="create-order"` |
| Pole formularza | `data-field` | `data-field="product-name"` |
| Wartość | `data-value` | `data-value="29.99"` |
| Status | `data-status` | `data-status="ready"` |
| ID encji | `data-id` | `data-id="550e8400-e29b-41d4-a716-446655440000"` |
| Typ widoku | `data-view` | `data-view="order-list"` |

#### 3. ARIA Labels i Role

```html
<button 
  data-action="complete-order"
  data-order-id="123"
  aria-label="Oznacz zamówienie 123 jako gotowe"
  role="button"
>
  <span aria-hidden="true">✓</span>
  Gotowe
</button>

<table role="table" aria-label="Lista zamówień">
  <thead>
    <tr role="row">
      <th role="columnheader" scope="col">Numer</th>
      <th role="columnheader" scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" data-order-id="123">
      <td role="cell" data-field="order-number">#123</td>
      <td role="cell" data-field="status" data-value="preparing">W przygotowaniu</td>
    </tr>
  </tbody>
</table>
```

#### 4. Struktura API Czytelna dla AI

##### Endpointy REST z Opisami

```typescript
// Każdy endpoint ma opisowy path i dokumentację
/**
 * @ai-description "Tworzy nowe zamówienie w systemie POS"
 * @ai-params {
 *   "customer_id": "UUID klienta",
 *   "items": "Lista produktów do zamówienia",
 *   "delivery_address": "Adres dostawy (opcjonalny dla odbioru)"
 * }
 * @ai-returns "Utworzone zamówienie z ID i szacowanym czasem"
 */
POST /api/v1/orders

/**
 * @ai-description "Pobiera listę produktów dostępnych w menu"
 * @ai-params {
 *   "point_id": "ID punktu sprzedaży (filtrowanie)",
 *   "category_id": "ID kategorii (opcjonalne)"
 * }
 * @ai-returns "Lista produktów z cenami i dostępnością"
 */
GET /api/v1/menu/products
```

##### Schema Zod dla Walidacji (czytelna dla AI)

```typescript
// schemas/order.ts
export const CreateOrderSchema = z.object({
  customer_id: z.string().uuid().describe("UUID klienta składającego zamówienie"),
  point_id: z.string().uuid().describe("ID punktu realizacji zamówienia"),
  channel: z.enum(["delivery", "pickup"]).describe("Kanał sprzedaży"),
  items: z.array(z.object({
    product_id: z.string().uuid().describe("ID produktu z menu"),
    variant_id: z.string().uuid().optional().describe("ID wariantu produktu"),
    quantity: z.number().min(1).describe("Ilość sztuk"),
    modifiers: z.array(z.string().uuid()).optional().describe("ID modyfikatorów")
  })).describe("Lista pozycji zamówienia"),
  delivery_address: z.object({
    street: z.string().describe("Ulica i numer"),
    city: z.string().describe("Miasto"),
    zip: z.string().describe("Kod pocztowy")
  }).optional().describe("Adres dostawy (wymagany dla delivery)"),
  notes: z.string().optional().describe("Notatki do zamówienia")
}).describe("Schema tworzenia zamówienia");

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
```

#### 5. Interfejs dla Agentów AI

##### Specjalne Endpointy dla AI

```typescript
// API dla agentów AI - zwraca strukturalne dane
GET /api/v1/ai/state
// Zwraca aktualny stan systemu w formacie JSON

{
  "current_view": "dashboard",
  "user": {
    "role": "manager",
    "location_id": "uuid"
  },
  "alerts": [
    {
      "type": "low_stock",
      "product_id": "uuid",
      "product_name": "Ser mozzarella",
      "current_quantity": 5,
      "min_quantity": 20
    }
  ],
  "actions_available": [
    {
      "action": "create_order",
      "endpoint": "POST /api/v1/orders",
      "description": "Utwórz nowe zamówienie"
    },
    {
      "action": "update_stock",
      "endpoint": "POST /api/v1/inventory/adjust",
      "description": "Zaktualizuj stan magazynowy"
    }
  ]
}
```

##### AI-Readable Page Metadata

```html
<head>
  <!-- Metadane dla agentów AI -->
  <meta name="ai:page-type" content="dashboard">
  <meta name="ai:user-role" content="manager">
  <meta name="ai:location-id" content="550e8400-e29b-41d4-a716-446655440000">
  <meta name="ai:permissions" content="orders:read,orders:write,inventory:read">
  <meta name="ai:available-actions" content="create-order,update-status,view-reports">
</head>
```

#### 6. Testowanie z Agentami AI

##### Playwright Tests jako Specyfikacja dla AI

```typescript
// tests/ai-navigation.spec.ts
import { test, expect } from '@playwright/test';

test('AI agent can create an order', async ({ page }) => {
  // AI agent nawiguje po aplikacji
  await page.goto('/pos/orders');

  // Znajduje przycisk używając data-action
  await page.click('[data-action="create-order"]');

  // Wypełnia formularz używając data-field
  await page.fill('[data-field="customer-phone"]", '123456789');
  await page.selectOption('[data-field="product-select"]', 'product-uuid');
  await page.fill('[data-field="quantity"]', '2');

  // Submit
  await page.click('[data-action="submit-order"]');

  // Weryfikacja - znajduje element po data-order-id
  const orderElement = await page.locator('[data-order-status="pending"]').first();
  await expect(orderElement).toBeVisible();
});
```

### Korzyści z AI-Friendly Design

| Korzyść | Opis |
|---------|------|
| **Automatyzacja** | Agenty AI mogą wykonywać powtarzalne zadania |
| **Testowanie** | Łatwiejsze E2E testy z Playwright |
| **Dostępność** | Lepsza dostępność dla osób z niepełnosprawnościami |
| **SEO** | Lepsze indeksowanie przez wyszukiwarki |
| **Przyszłość** | Gotowość na rozwój AI |

---

## 3. MODUŁ ZARZĄDZANIA MENU

### 3.1 Struktura Menu

```
MENU
├── KATEGORIA (np. Burgery)
│   ├── PODKATEGORIA (np. Klasyczne)
│   │   ├── PRODUKT (np. Cheeseburger)
│   │   │   ├── WARIANT (np. Mały, Średni, Duży)
│   │   │   └── WERSJA (np. Standard, Menu z frytkami)
```

### 3.2 Model Produktu

| Atrybut | Typ | Opis | Wymagane |
|---------|-----|------|----------|
| `id` | UUID | Unikalny identyfikator | Tak |
| `sku` | String | Kod SKU | Tak |
| `name` | String | Nazwa produktu | Tak |
| `description` | Text | Opis produktu | Nie |
| `category_id` | UUID | ID kategorii | Tak |
| `recipe_id` | UUID | ID receptury | Tak |
| `base_price` | Decimal | Cena bazowa | Tak |
| `cost_price` | Decimal | Koszt wytworzenia | Auto |
| `tax_rate` | Decimal | Stawka VAT | Tak |
| `preparation_time` | Integer | Czas przygotowania (min) | Tak |
| `allergens` | Array | Lista alergenów | Auto |
| `is_active` | Boolean | Czy aktywny | Tak |
| `point_ids` | Array | Dostępność w punktach | Tak |

### 3.3 Warianty Produktu

| Typ | Przykład | Opis |
|-----|----------|------|
| **Rozmiar** | Mały, Średni, Duży | Różne wielkości porcji |
| **Wersja** | Standard, Menu, Premium | Różne zestawy składników |
| **Waga** | 200g, 300g, 500g | Produkty na wagę |

### 3.4 Modyfikatory i Dodatki

| Typ | Przykład | Opis |
|-----|----------|------|
| **Dodatek** | + Ser, + Bekon | Dodanie składnika za dopłatą |
| **Usunięcie** | - Cebula, - Sos | Usunięcie składnika |
| **Zamiana** | Zamień bułkę na bezglutenową | Podmiana składnika |
| **Wariant przygotowania** | Dobrze wysmażony, Krwisty | Sposób przygotowania |

### 3.5 Promocje i Happy Hours

| Typ | Opis | Przykład |
|-----|------|----------|
| **Procentowa** | Zniżka procentowa | -20% na wszystkie burgery |
| **Kwotowa** | Zniżka kwotowa | -10 zł przy zamówieniu > 50 zł |
| **2 za 1** | Kup X, dostaniesz Y | Kup 2 burgery, 3-ci za 1 zł |
| **Zestaw** | Promocyjny zestaw | Burger + frytki + napój za 29 zł |
| **Happy Hour** | Czasowa obniżka cen | -30% w godzinach 14:00-16:00 |

### 3.6 Funkcje - Zarządzanie Menu

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| MENU-001 | Tworzenie kategorii | CRUD hierarchii kategorii | Wysoki |
| MENU-002 | Edycja kategorii | Modyfikacja atrybutów kategorii | Wysoki |
| MENU-003 | Tworzenie produktu | Kreator produktu wieloetapowy | Wysoki |
| MENU-004 | Zarządzanie cenami | Ceny wielopoziomowe (delivery/pickup) | Wysoki |
| MENU-005 | Dostępność produktów | Statusy dostępności, synchronizacja | Wysoki |
| MENU-006 | Tworzenie promocji | Kreator promocji z walidacją reguł | Średni |
| MENU-007 | Happy Hours | Definiowanie okien czasowych | Średni |
| MENU-008 | Zarządzanie modyfikatorami | Grupy modyfikatorów per produkt | Wysoki |

---

## 4. MODUŁ RECEPTUR I SKŁADNIKÓW

### 4.1 Typologia Produktów

```
PRODUKTY
├── SUROWCE (RAW_MATERIAL)
│   ├── Mięso i drób
│   ├── Ryby i owoce morza
│   ├── Warzywa
│   ├── Nabiał
│   └── Przyprawy
├── PÓŁPRODUKTY (SEMI_FINISHED)
│   ├── Sosy (BBQ, czosnkowy, majonez)
│   ├── Marynaty
│   ├── Klopsy burgerowe
│   └── Surówki
└── GOTOWE DANIA (FINISHED_GOOD)
    ├── Burgery
    ├── Zupy
    └── Desery
```

### 4.2 Model Składnika

| Atrybut | Typ | Opis | Wymagane |
|---------|-----|------|----------|
| `id` | UUID | Unikalny identyfikator | Tak |
| `sku` | String | Kod SKU | Tak |
| `name` | String | Nazwa składnika | Tak |
| `unit` | Enum | Jednostka miary (g, ml, szt) | Tak |
| `purchase_unit` | Enum | Jednostka zakupu | Tak |
| `conversion_rate` | Decimal | Przelicznik jednostek | Tak |
| `current_price` | Decimal | Aktualna cena zakupu | Tak |
| `supplier_id` | UUID | ID dostawcy | Nie |
| `allergens` | Array | Alergeny | Tak |

### 4.3 Alergeny (14 wymaganych przez UE)

1. Zboża zawierające gluten
2. Skorupiaki
3. Jaja
4. Ryby
5. Orzeszki ziemne
6. Soja
7. Mleko
8. Orzechy
9. Seler
10. Gorczyca
11. Sezam
12. Dwutlenek siarki i siarczyny
13. Łubin
14. Mięczaki

### 4.4 Model Receptury (BOM)

| Atrybut | Typ | Opis | Wymagane |
|---------|-----|------|----------|
| `id` | UUID | Unikalny identyfikator | Tak |
| `name` | String | Nazwa receptury | Tak |
| `product_id` | UUID | ID produktu | Tak |
| `version` | Integer | Wersja receptury | Auto |
| `yield_amount` | Decimal | Ilość wytwarzana | Tak |
| `yield_unit` | Enum | Jednostka wytwarzana | Tak |
| `preparation_time` | Integer | Czas przygotowania (min) | Tak |
| `instructions` | Text | Instrukcja wykonania | Tak |
| `total_cost` | Decimal | Całkowity koszt | Auto |

### 4.5 Struktura Zagnieżdżona Receptur

```
Burger (produkt finalny)
├── Bułka (surowiec)
├── Kotlet (półprodukt)
│   ├── Mięso wołowe (surowiec)
│   ├── Przyprawy (surowiec)
│   └── Sos marynaty (półprodukt)
│       ├── Olej (surowiec)
│       └── Zioła (surowiec)
├── Sos BBQ (półprodukt)
│   ├── Przecier pomidorowy (surowiec)
│   └── Przyprawy (surowiec)
└── Warzywa (surowce)
```

### 4.6 Kalkulacja Kosztów

```
KOSZT DANIA = Σ(Koszt półproduktów × Ilość)
              + Koszt opakowania
              + Koszt robocizny (opcjonalnie)
              + Narzut na odpad

Marża brutto = (Cena sprzedaży - Koszt własny) / Cena sprzedaży × 100%
```

### 4.7 Funkcje - Receptury i Składniki

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| REC-001 | Zarządzanie składnikami | CRUD składników | Wysoki |
| REC-002 | Alergeny | Baza 14 alergenów UE | Wysoki |
| REC-003 | Tworzenie receptury | Kreator receptury krok po kroku | Wysoki |
| REC-004 | Edycja receptury | Wersjonowanie, historia zmian | Wysoki |
| REC-005 | Kalkulacja kosztów | Automatyczne przeliczanie kosztów | Wysoki |
| REC-006 | Składniki dzielone | Receptury składników wspólnych | Średni |
| REC-007 | Porównanie wersji | Porównanie składników i kosztów | Średni |

---

## 5. MODUŁ MAGAZYNOWY

### 5.1 Struktura Magazynowa

```
ORGANIZACJA (Sieć Gastronomiczna)
│
├── KUCHNIA CENTRALNA (typ: CENTRAL)
│   ├── MAGAZYN_SUROWCÓW (typ: RAW_MATERIALS)
│   │   ├── Strefa: CHŁODNIA (0-4°C)
│   │   ├── Strefa: MROŹNIA (-18°C)
│   │   └── Strefa: SUCHA (pokojowa)
│   │
│   └── MAGAZYN_PÓŁPRODUKTÓW (typ: SEMI_FINISHED)
│       ├── Strefa: CHŁODNIA_GOTOWE
│       └── Strefa: MROŹNIA_GOTOWE
│
├── PUNKT_SPRZEDAŻY_1 (typ: OUTLET)
│   └── MAGAZYN_PUNKTU (typ: OUTLET_STORAGE)
│
└── PUNKT_SPRZEDAŻY_N (typ: OUTLET)
    └── MAGAZYN_PUNKTU (typ: OUTLET_STORAGE)
```

### 5.2 Stany Magazynowe

```
STAN FIZYCZNY (Physical) = Ilość faktycznie w magazynie
STAN DOSTĘPNY (Available) = STAN FIZYCZNY - REZERWACJE
STAN ZAREZERWOWANY (Reserved) = Ilość zarezerwowana dla zamówień
STAN W DRODZE (In Transit) = Ilość w trakcie transportu
```

### 5.3 Śledzenie Partii (Batch Tracking)

| Pole | Typ | Opis |
|------|-----|------|
| `batch_number` | VARCHAR(50) | Numer partii (auto) |
| `product_id` | UUID | ID produktu |
| `production_date` | DATE | Data produkcji |
| `expiry_date` | DATE | Data przydatności |
| `quantity_initial` | DECIMAL | Początkowa ilość |
| `quantity_current` | DECIMAL | Aktualna ilość |
| `unit_cost` | DECIMAL | Koszt jednostkowy |

### 5.4 FEFO - First Expired First Out

```python
# Pseudokod algorytmu FEFO
def get_batch_for_issue(product_id, warehouse_id, quantity_needed):
    batches = get_active_batches(product_id, warehouse_id)
    valid_batches = [b for b in batches if b.expiry_date > today()]
    valid_batches.sort(key=lambda b: b.expiry_date)  # Sortuj po dacie przydatności
    # Pobierz z partii z najwcześniejszą datą przydatności
```

### 5.5 Statusy Partii

| Status | Definicja | Akcja systemu |
|--------|-----------|---------------|
| **FRESH** | > 50% okresu przydatności | Normalne wydawanie |
| **WARNING** | 25-50% okresu przydatności | Alert, priorytet wydania |
| **CRITICAL** | < 25% okresu przydatności | Alert HACCP, wymuszony FEFO |
| **EXPIRED** | Przekroczona data | Blokada wydania |

### 5.6 Przesunięcia Między Magazynami (KC → Punkt)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ZLECENIE  │───▶│  KOMPLETACJA│───▶│  WYSYŁKA    │───▶│  ODBIÓR     │
│   (Punkt)   │    │  (KC)       │    │  (KC)       │    │  (Punkt)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     Status:          Status:           Status:           Status:
     DRAFT            PENDING           IN_TRANSIT        COMPLETED
```

### 5.7 Kategorie Strat

```
STRATY
├── PRZETERMINOWANIE (EXPIRY)
├── USZKODZENIE (DAMAGE)
├── BŁĄD LUDZKI (HUMAN_ERROR)
├── KRADZIEŻ (THEFT)
├── PRODUKCYJNE (PRODUCTION)
└── INNE (OTHER)
```

### 5.8 Inwentaryzacja

| Typ | Częstotliwość | Zakres |
|-----|--------------|--------|
| **Dzienna (rotacyjna)** | Codziennie | 1-2 kategorie |
| **Tygodniowa** | Co tydzień | Wysokowartościowe |
| **Miesięczna** | Co miesiąc | Cały magazyn |
| **Ad-hoc** | Na żądanie | Wybrany asortyment |

### 5.9 Metody Wyceny Zapasów

| Metoda | Opis | Zastosowanie |
|--------|------|--------------|
| **FIFO** | First In First Out | Produkty z datą przydatności |
| **Średnia ważona** | Średnia ze wszystkich przyjęć | Produkty długoterminowe |
| **Cena jednostkowa** | Stała cena z karty | Produkty nieznaczne wartościowo |

### 5.10 Funkcje - Moduł Magazynowy

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| MAG-001 | Zarządzanie magazynami | CRUD magazynów, stref, lokalizacji | Wysoki |
| MAG-002 | Zarządzanie produktami | CRUD produktów magazynowych | Wysoki |
| MAG-003 | Zamówienia do dostawców | PO z workflow akceptacji | Wysoki |
| MAG-004 | Przyjęcie dostawy | Kontrola jakości, generowanie partii | Wysoki |
| MAG-005 | Przesunięcia między magazynami | KC ↔ Punkty | Wysoki |
| MAG-006 | Stany magazynowe | Podgląd w czasie rzeczywistym | Wysoki |
| MAG-007 | Alerty zapasów | Niskie stany, przydatność | Wysoki |
| MAG-008 | Log HACCP | Rejestr pomiarów temperatury | Wysoki |
| MAG-009 | Rejestracja strat | Kategorie, analiza przyczyn | Wysoki |
| MAG-010 | Inwentaryzacja | Spis mobilny, korekty | Wysoki |
| MAG-011 | Kalkulacja kosztów | FIFO, średnia ważona | Wysoki |
| MAG-012 | Automatyczne zamawianie | Reguły auto-order | Średni |

---

## 6. MODUŁ OBSŁUGI ZAMÓWIEŃ I KDS

### 6.1 Źródła Zamówień

| Źródło | Opis | Kanał |
|--------|------|-------|
| **Aplikacja mobilna** | Własna aplikacja klienta | Delivery/Pickup |
| **POS lokalny** | Zamówienie na miejscu | Eat-in/Takeaway |
| **Telefon** | Zamówienie telefoniczne | Delivery/Pickup |

### 6.2 Statusy Zamówień

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PENDING   │────▶│  CONFIRMED  │────▶│  ACCEPTED   │
│  (Oczekuje) │     │ (Potwierdz.)│     │ (Przyjęte)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
       ┌────────────────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ PREPARING   │────▶│   READY     │────▶│  OUT_FOR    │
│(W przygot.) │     │  (Gotowe)   │     │  DELIVERY   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   SERVED    │
                    │  (Wydane)   │
                    └─────────────┘
```

| Status | Opis | Powiadomienie klienta |
|--------|------|----------------------|
| `pending` | Zamówienie utworzone | Tak |
| `confirmed` | Płatność potwierdzona | Tak |
| `accepted` | Punkt przyjął zamówienie | Tak |
| `preparing` | Kuchnia rozpoczęła przygotowanie | Tak |
| `ready` | Zamówienie gotowe | Tak |
| `out_for_delivery` | Kurier odebrał zamówienie | Tak |
| `delivered` | Zamówienie dostarczone | Tak |
| `served` | Zamówienie wydane klientowi | Tak |
| `cancelled` | Zamówienie anulowane | Tak |

### 6.3 Model Zamówienia

| Atrybut | Typ | Opis |
|---------|-----|------|
| `id` | UUID | Unikalny identyfikator |
| `order_number` | String | Numer zamówienia (dla klienta) |
| `source` | Enum | Źródło zamówienia |
| `channel` | Enum | Kanał sprzedaży |
| `point_id` | UUID | ID punktu realizacji |
| `customer_id` | UUID | ID klienta |
| `items` | JSON | Pozycje zamówienia |
| `total_amount` | Decimal | Kwota całkowita |
| `payment_method` | Enum | Metoda płatności |
| `payment_status` | Enum | Status płatności |
| `status` | Enum | Status zamówienia |
| `estimated_ready_time` | DateTime | Szacowany czas gotowości |

### 6.4 Kitchen Display System (KDS)

#### Architektura KDS

```
┌─────────────────────────────────────────────────────────────┐
│                    EKRAN KUCHENNY KDS                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  NOWE        │  │ W PRZYGOT.   │  │  GOTOWE      │      │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │      │
│  │  │Zam #12 │  │  │  │Zam #10 │  │  │  │Zam #8  │  │      │
│  │  │14:32   │  │  │  │14:25   │  │  │  │14:15   │  │      │
│  │  │Burger  │  │  │  │Burger  │  │  │  │        │  │      │
│  │  │Frytki  │  │  │  │        │  │  │  │        │  │      │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### Kolory Priorytetów

- 🟢 **Zielony** - w normie czasowej
- 🟡 **Żółty** - zbliża się limit czasu
- 🔴 **Czerwony** - przekroczony czas

### 6.5 Funkcje - Obsługa Zamówień i KDS

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| ORD-001 | Przyjmowanie zamówień | Odbiór zamówienia przez API | Wysoki |
| ORD-002 | Szacowany czas realizacji | Algorytm uwzględniający obciążenie | Wysoki |
| ORD-003 | Zarządzanie kolejką | Widok aktywnych zamówień | Wysoki |
| ORD-004 | Anulowania i zwroty | Polityka zwrotów, automatyczne zwroty | Wysoki |
| ORD-005 | Notatki do zamówień | Kategorie notatek | Średni |
| KDS-001 | Przyjmowanie zamówienia | Automatyczne pojawienie w KDS | Wysoki |
| KDS-002 | Rozpoczęcie przygotowania | Przeciągnięcie do "W przygotowaniu" | Wysoki |
| KDS-003 | Oznaczenie jako gotowe | Przycisk "Gotowe" | Wysoki |
| KDS-004 | Wydanie zamówienia | Archiwizacja, aktualizacja statusu | Wysoki |
| KDS-005 | Priorytetyzacja | Ręczne i automatyczne priorytety | Średni |
| KDS-006 | Widok grupowany | Grupowanie per stacja kuchenna | Średni |
| KDS-007 | Historia zamówień | Statystyki, eksport | Średni |

---

## 7. MODUŁ CRM I PROGRAM LOJALNOŚCIOWY

### 7.1 Profil Klienta

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `id` | UUID | Tak | Unikalny identyfikator |
| `first_name` | VARCHAR(50) | Tak | Imię |
| `email` | VARCHAR(100) | Tak | Email (unikalny) |
| `phone` | VARCHAR(20) | Tak | Telefon |
| `birth_date` | DATE | Nie | Data urodzenia |
| `registration_date` | DATETIME | Tak | Data rejestracji |
| `source` | ENUM | Tak | Źródło pozyskania |
| `marketing_consent` | BOOLEAN | Tak | Zgoda na marketing |
| `loyalty_tier` | ENUM | Auto | Poziom lojalnościowy |
| `loyalty_points` | INTEGER | Auto | Punkty lojalnościowe |

### 7.2 Segmentacja RFM

| Segment | Kryteria RFM | Opis |
|---------|--------------|------|
| **Champions** | R=5, F=5, M=5 | Najlepsi klienci |
| **Loyal Customers** | R=4-5, F=4-5 | Lojalni klienci |
| **Potential Loyalists** | R=4-5, F=2-3 | Potencjalnie lojalni |
| **New Customers** | R=5, F=1 | Nowi klienci |
| **At Risk** | R=2, F=2-3 | Ryzyko utraty |
| **Lost** | R=1, F=1 | Utraceni |

### 7.3 System Punktowy

#### Reguły Naliczania Punktów

| Reguła | Warunek | Punkty |
|--------|---------|--------|
| Podstawowa | Za każde wydane 1 PLN | 1 pkt |
| Poziom Brązowy | Mnożnik podstawowy | ×1.0 |
| Poziom Srebrny | Mnożnik podstawowy | ×1.25 |
| Poziom Złoty | Mnożnik podstawowy | ×1.5 |
| Pierwsze zamówienie | Bonus powitalny | 50 pkt |
| Urodziny | Bonus urodzinowy | 100 pkt |
| Rekomendacja | Za polecenie znajomego | 100 pkt |

#### Poziomy Lojalnościowe

| Poziom | Wymagane punkty (rocznie) | Korzyści |
|--------|---------------------------|----------|
| **Brązowy** | 0-499 pkt | Podstawowy mnożnik |
| **Srebrny** | 500-1499 pkt | Mnożnik ×1.25, darmowa dostawa |
| **Złoty** | 1500+ pkt | Mnożnik ×1.5, priorytetowa obsługa |

### 7.4 Katalog Nagród

| Nagroda | Wymagane punkty | Typ |
|---------|-----------------|-----|
| Darmowa dostawa | 100 pkt | Kupon |
| 10% zniżki | 200 pkt | Kupon |
| Darmowy napój | 250 pkt | Produkt |
| 20% zniżki | 400 pkt | Kupon (Srebrny+) |
| Darmowy deser | 350 pkt | Produkt (Srebrny+) |
| Darmowe danie główne | 800 pkt | Produkt (Złoty) |

### 7.5 Automatyczne Kupony

| Scenariusz | Trigger | Kupon | Ważność |
|------------|---------|-------|---------|
| Witamy nowego | Pierwsza rejestracja | 15% na pierwsze zamówienie | 14 dni |
| Urodziny | Dzień urodzin | Darmowy deser | 7 dni |
| Brak aktywności | 30 dni bez zamówienia | 20% powrotne | 7 dni |
| Długa nieaktywność | 60 dni bez zamówienia | Darmowa dostawa + 15% | 7 dni |

### 7.6 Powiadomienia o Statusie Zamówienia

| Status | Kanał | Timing |
|--------|-------|--------|
| Zamówienie przyjęte | Push/SMS/Email | Natychmiast |
| W przygotowaniu | Push | Zmiana statusu |
| Gotowe do odbioru | Push/SMS | Zmiana statusu |
| W drodze | Push/SMS | Zmiana statusu |
| Dostarczone | Push/Email | Dostarczenie |
| Opóźnienie | Push/SMS | Wykrycie opóźnienia |

### 7.7 Funkcje - CRM i Lojalność

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| CRM-001 | Baza klientów | CRUD profili klientów | Wysoki |
| CRM-002 | Segmentacja RFM | Automatyczna segmentacja | Średni |
| CRM-003 | System punktowy | Naliczanie i historia punktów | Wysoki |
| CRM-004 | Poziomy lojalnościowe | Automatyczne awanse | Średni |
| CRM-005 | Katalog nagród | Zarządzanie nagrodami | Średni |
| CRM-006 | Automatyczne kupony | Generowanie kuponów | Średni |
| CRM-007 | Powiadomienia statusów | Multi-kanałowe powiadomienia | Wysoki |
| CRM-008 | Kampanie marketingowe | Szablony, automatyzacje | Średni |
| CRM-009 | System opinii | Oceny i komentarze | Średni |
| CRM-010 | Reklamacje | Workflow reklamacyjny | Średni |

---

## 8. MODUŁ RAPORTOWANIA I DASHBOARDY

### 8.1 Dashboard Zarządczy (Executive Dashboard)

#### Główne KPIs (Top Bar)

| KPI | Wartość | vs Wczoraj | vs Tydzień | vs Plan |
|-----|---------|------------|------------|---------|
| Przychód dzisiaj | 45,230 PLN | +12% | +8% | 102% |
| Zamówienia dzisiaj | 1,124 | +5% | +3% | 98% |
| AOV | 40.24 PLN | +7% | +5% | 104% |
| Śr. czas realizacji | 38 min | -2 min | -3 min | 95% |
| Ocena klientów | 4.7/5 | 0 | +0.1 | 100% |

#### Sekcje Dashboardu

1. **Sprzedaż** - Wykres liniowy 7 dni z porównaniem
2. **Kanały Sprzedaży** - Wykres kołowy z konwersją
3. **Top 5 Produktów Dzisiaj** - Ranking z trendem
4. **Mapa Cieplna Godzinowa** - Zamówienia per godzina
5. **Status Zamówień (Real-time)** - Licznik aktywnych zamówień
6. **AlertBox** - Ważne powiadomienia
7. **Finanse (Miesięczne)** - Przychód MTD, marża
8. **Klienci** - Nowi, aktywni, retention rate

### 8.2 Dashboard Kierownika Punktu

| Metryka | Dzisiaj | Wczoraj | Cel |
|---------|---------|---------|-----|
| Przychód | 8,500 PLN | 7,800 PLN | 8,000 PLN |
| Zamówienia | 210 | 195 | 200 |
| AOV | 40.48 | 40.00 | 40.00 |
| Śr. czas | 35 min | 38 min | 40 min |

### 8.3 Dashboard Kierownika Kuchni

- Bieżąca kolejka zamówień
- Statystyki godzinowe z prognozą
- Top produkty (dzisiaj)
- Stan magazynu - kuchnia
- Wydajność kucharzy
- Alerty kuchenne

### 8.4 Raporty Sprzedażowe

| ID | Raport | Częstotliwość | Odbiorcy |
|----|--------|--------------|----------|
| RPT-SALE-001 | Sprzedaż - Podsumowanie | Dzienna/Tygodniowa | Zarząd |
| RPT-SALE-002 | Analiza Produktów (Top/Flop) | Dzienna | Zarząd, Kucharze |
| RPT-SALE-003 | Sprzedaż według Kategorii | Tygodniowa | Zarząd |
| RPT-SALE-004 | Rozkład Godzinowy (Heatmapa) | Dzienna | Kierownicy |
| RPT-SALE-005 | Analiza Kanałów Sprzedaży | Dzienna | Marketing |

### 8.5 Raporty Operacyjne

| ID | Raport | Częstotliwość | Odbiorcy |
|----|--------|--------------|----------|
| RPT-OPS-001 | Analiza Czasu Realizacji | Dzienna | Kierownicy |
| RPT-OPS-002 | Wydajność Zespołu | Dzienna | Kierownicy |
| RPT-OPS-003 | Analiza Anulowań | Dzienna | Zarząd |
| RPT-OPS-004 | Braki i Niedostępności | Dzienna | Kierownicy |
| RPT-OPS-005 | Benchmarking Punktów | Tygodniowa | Zarząd |

### 8.6 Raporty Finansowe

| ID | Raport | Częstotliwość | Odbiorcy |
|----|--------|--------------|----------|
| RPT-FIN-001 | P&L Statement | Miesięczna | Zarząd, Księgowość |
| RPT-FIN-002 | Analiza Marż | Tygodniowa | Zarząd |
| RPT-FIN-003 | Analiza Kosztów Składników | Tygodniowa | Zarząd |
| RPT-FIN-004 | Analiza Strat | Tygodniowa | Zarząd |
| RPT-FIN-005 | Mix Płatności | Dzienna | Księgowość |

### 8.7 Raporty Magazynowe

| ID | Raport | Częstotliwość | Odbiorcy |
|----|--------|--------------|----------|
| RPT-INV-001 | Stany Magazynowe | Dzienna | Magazynierzy |
| RPT-INV-002 | Analiza Rotacji | Tygodniowa | Zarząd |
| RPT-INV-003 | Produkty z Kończącą się Datą | Dzienna | Magazynierzy |
| RPT-INV-004 | Wartość Magazynu | Miesięczna | Księgowość |
| RPT-INV-005 | Sugestie Zakupowe | Dzienna | Magazynierzy |

### 8.8 KPIs - Metryki Biznesowe

#### KPIs Sprzedażowe

| KPI | Definicja | Cel |
|-----|-----------|-----|
| Revenue | Całkowity przychód | Wzrost 10% YoY |
| Orders | Liczba zamówień | Wzrost 8% YoY |
| AOV | Średnia wartość zamówienia | > 40 PLN |

#### KPIs Operacyjne

| KPI | Definicja | Cel |
|-----|-----------|-----|
| Order Fulfillment Time | Czas od zamówienia do dostarczenia | < 45 min |
| On-Time Delivery % | % zamówień w czasie | > 90% |
| Cancellation Rate | % anulowanych zamówień | < 3% |

#### KPIs Finansowe

| KPI | Definicja | Cel |
|-----|-----------|-----|
| Gross Margin | (Przychód - COGS) / Przychód | > 65% |
| Food Cost % | Koszt składników / Przychód | < 30% |
| Waste % | Wartość strat / Przychód | < 2% |

#### KPIs Klientów

| KPI | Definicja | Cel |
|-----|-----------|-----|
| NPS | Net Promoter Score | > 50 |
| Customer Satisfaction | Średnia ocena 1-5 | > 4.5 |
| Customer Retention | % klientów powracających | > 60% |

### 8.9 Funkcje - Raportowanie

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| RPT-001 | Dashboard zarządczy | Real-time KPIs | Wysoki |
| RPT-002 | Dashboard kierownika | Widok per punkt | Wysoki |
| RPT-003 | Dashboard kuchni | Kolejka, wydajność | Wysoki |
| RPT-004 | Raporty sprzedażowe | 6 szczegółowych raportów | Wysoki |
| RPT-005 | Raporty operacyjne | 5 raportów efektywności | Wysoki |
| RPT-006 | Raporty finansowe | 5 raportów finansowych | Wysoki |
| RPT-007 | Raporty magazynowe | 5 raportów zapasów | Wysoki |
| RPT-008 | Eksport danych | Excel, CSV, PDF | Średni |
| RPT-009 | Automatyczne raporty mailowe | Zaplanowane wysyłki | Średni |

---

## 9. MODUŁ LUDZIE (PRACOWNICY I CZAS PRACY)

### 9.1 Cel Modułu

Moduł "Ludzie" umożliwia:
- Zarządzanie pracownikami (dane, stawki, role)
- Rejestrację czasu pracy (wejścia/wyjścia)
- Kalkulację kosztów pracy per dzień / zamówienie
- Raportowanie obecności i wydajności

### 9.2 Model Pracownika

| Atrybut | Typ | Opis | Wymagane |
|---------|-----|------|----------|
| `id` | UUID | Unikalny identyfikator | Tak |
| `first_name` | VARCHAR(50) | Imię | Tak |
| `last_name` | VARCHAR(50) | Nazwisko | Tak |
| `email` | VARCHAR(100) | Email | Tak |
| `phone` | VARCHAR(20) | Telefon | Tak |
| `employee_code` | VARCHAR(20) | Kod pracownika (do logowania) | Tak |
| `pin` | VARCHAR(4) | PIN do szybkiego logowania | Tak |
| `role` | ENUM | Rola w systemie | Tak |
| `employment_type` | ENUM | Etat/Umowa zlecenie/Inna | Tak |
| `hourly_rate` | DECIMAL | Stawka godzinowa (PLN) | Tak |
| `overtime_rate` | DECIMAL | Stawka nadgodzin (PLN) | Nie |
| `hire_date` | DATE | Data zatrudnienia | Tak |
| `is_active` | BOOLEAN | Czy aktywny | Tak |
| `default_location_id` | UUID | Domyślny punkt pracy | Nie |

#### Role Pracowników

| Rola | Uprawnienia | Typowy dla |
|------|-------------|------------|
| `admin` | Pełne uprawnienia | Właściciel, zarząd |
| `manager` | Zarządzanie punktem, raporty | Kierownik lokalu |
| `chef` | KDS, produkcja | Kucharz |
| `cook` | KDS, przygotowanie | Kucharz pomocniczy |
| `cashier` | Zamówienia, wydanie | Kasjer |
| `delivery` | Dostawy | Kierowca/dostawca |
| `warehouse` | Magazyn, inwentaryzacja | Magazynier |

### 9.3 Rejestracja Czasu Pracy

#### Model Czasu Pracy (WorkTime)

| Atrybut | Typ | Opis |
|---------|-----|------|
| `id` | UUID | Unikalny identyfikator |
| `employee_id` | UUID | ID pracownika |
| `location_id` | UUID | ID punktu/lokacji |
| `date` | DATE | Data |
| `clock_in` | DATETIME | Czas wejścia |
| `clock_out` | DATETIME | Czas wyjścia |
| `break_duration_minutes` | INTEGER | Długość przerwy (min) |
| `total_hours` | DECIMAL | Całkowity czas pracy (godz) |
| `overtime_hours` | DECIMAL | Nadgodziny (godz) |
| `status` | ENUM | Status wpisu |
| `notes` | TEXT | Notatki |
| `created_at` | DATETIME | Timestamp utworzenia |
| `updated_at` | DATETIME | Timestamp aktualizacji |

#### Statusy Wpisu Czasu Pracy

| Status | Opis |
|--------|------|
| `active` | Pracownik aktualnie w pracy (nie zakończył zmiany) |
| `completed` | Zmiana zakończona |
| `edited` | Wpis był edytowany przez managera |
| `approved` | Wpis zatwierdzony (do wypłaty) |

### 9.4 Przepływ Rejestracji Czasu Pracy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REJESTRACJA CZASU PRACY                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  WEJŚCIE    │───▶│   PRACA     │───▶│  WYJŚCIE    │             │
│  │             │    │             │    │             │             │
│  │ • Logowanie │    │ • Automatycz│    │ • Zakończen│             │
│  │   (PIN/kod) │    │   ny zapis  │    │   ie zmiany│             │
│  │ • Wybór     │    │   aktywności│    │ • Podsumow│             │
│  │   punktu    │    │ • Break     │    │   anie     │             │
│  │ • Zdjęcie   │    │   (opcjonal│    │   godzin   │             │
│  │   (opcjonal)│    │   nie)      │    │             │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.5 Funkcje Modułu Pracownicy

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| **EMP-001** | Dodawanie pracownika | Kreator nowego pracownika | Wysoki |
| **EMP-002** | Edycja pracownika | Modyfikacja danych, stawek | Wysoki |
| **EMP-003** | Deaktywacja pracownika | Zakończenie współpracy | Wysoki |
| **EMP-004** | Logowanie PIN/kodem | Szybkie logowanie do systemu | Wysoki |
| **EMP-005** | Rejestracja wejścia | Clock-in z wyborem punktu | Wysoki |
| **EMP-006** | Rejestracja wyjścia | Clock-out z podsumowaniem | Wysoki |
| **EMP-007** | Rejestracja przerwy | Start/stop przerwy | Średni |
| **EMP-008** | Widok aktywnych pracowników | Kto jest aktualnie w pracy | Wysoki |
| **EMP-009** | Kalendarz pracownika | Grafik, zmiany | Średni |
| **EMP-010** | Edycja wpisów (manager) | Korekta czasu pracy | Średni |
| **EMP-011** | Zatwierdzanie wpisów | Akceptacja do wypłaty | Średni |

### 9.6 Kalkulacja Kosztów Pracy

#### Koszt Pracy per Dzień

```
Koszt_dnia = (Godziny_normalne × Stawka_godzinowa)
           + (Nadgodziny × Stawka_nadgodzin)
           + (Dodatki: nocne, świąteczne)
```

#### Koszt Pracy per Zamówienie (opcjonalnie)

```
Koszt_pracy_zamowienia = (Czas_przygotowania_min / 60) 
                        × Srednia_stawka_kucharzy_aktualnie_w_pracy
```

#### Przykład w Systemie

| Data | Pracownik | Wejście | Wyjście | Przerwa | Godziny | Stawka | Koszt |
|------|-----------|---------|---------|---------|---------|--------|-------|
| 2024-01-15 | Anna K. | 08:00 | 16:00 | 30 min | 7.5h | 25 PLN | 187.50 PLN |
| 2024-01-15 | Jan K. | 10:00 | 18:00 | 30 min | 7.5h | 22 PLN | 165.00 PLN |
| 2024-01-15 | Maria W. | 14:00 | 22:00 | 30 min | 7.5h | 28 PLN | 210.00 PLN |
| **RAZEM** | | | | | **22.5h** | | **562.50 PLN** |

### 9.7 Raporty Pracownicze

| ID | Raport | Opis | Częstotliwość |
|----|--------|------|---------------|
| **RPT-EMP-001** | Obecność dzienna | Kto był w pracy danego dnia | Dzienna |
| **RPT-EMP-002** | Podsumowanie godzin | Suma godzin per pracownik | Tygodniowa/Miesięczna |
| **RPT-EMP-003** | Nadgodziny | Lista nadgodzin per pracownik | Miesięczna |
| **RPT-EMP-004** | Koszty pracy | Koszty personalne per okres | Miesięczna |
| **RPT-EMP-005** | Wydajność kucharzy | Zamówienia per godzinę pracy | Tygodniowa |
| **RPT-EMP-006** | Spóźnienia i nieobecności | Analiza dyscypliny | Miesięczna |

### 9.8 Integracja z Kosztami Zamówień

#### Scenariusz: Koszt Pracy w Kalkulacji Zamówienia

```typescript
// Przykład: Dodanie kosztu pracy do zamówienia
interface OrderWithLaborCost {
  id: string;
  items: OrderItem[];
  subtotal: number;
  labor_cost: number;  // NOWE: koszt pracy
  total_cost: number;  // koszt składników + koszt pracy
  margin: number;
}

// Kalkulacja kosztu pracy dla zamówienia
function calculateLaborCost(
  order: Order,
  activeChefs: Employee[],
  preparationTimeMinutes: number
): number {
  const avgHourlyRate = activeChefs.reduce((sum, chef) => 
    sum + chef.hourly_rate, 0
  ) / activeChefs.length;

  const laborHours = preparationTimeMinutes / 60;
  return laborHours * avgHourlyRate;
}
```

### 9.9 Dashboard Pracowniczy

#### Widok Kierownika

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD PRACOWNIKÓW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  DZISIAJ (15.01.2024)                                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │
│  │  │ Pracowników │  │ Godzin      │  │ Koszt pracy │          │   │
│  │  │ w pracy: 5  │  │ łącznie: 32 │  │ 890 PLN     │          │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AKTUALNIE W PRACY                                          │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐             │   │
│  │  │ Imię     │ Wejście  │ Godziny  │ Status   │             │   │
│  │  ├──────────┼──────────┼──────────┼──────────┤             │   │
│  │  │ Anna K.  │ 08:00    │ 6h 30m   │ 🟢 Aktywn│             │   │
│  │  │ Jan K.   │ 10:00    │ 4h 30m   │ 🟡 Przerw│             │   │
│  │  │ Maria W. │ 14:00    │ 1h 00m   │ 🟢 Aktywn│             │   │
│  │  └──────────┴──────────┴──────────┴──────────┘             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.10 AI-Friendly Atrybuty dla Modułu Pracowników

```html
<!-- Przykład interfejsu rejestracji czasu pracy -->
<div data-view="employee-clock-in">
  <h1 data-field="page-title">Rejestracja czasu pracy</h1>

  <form data-form="clock-in">
    <input 
      data-field="employee-code" 
      type="text" 
      placeholder="Kod pracownika"
      aria-label="Kod pracownika"
    />

    <input 
      data-field="pin" 
      type="password" 
      maxlength="4"
      placeholder="PIN"
      aria-label="PIN"
    />

    <select data-field="location" aria-label="Wybierz punkt">
      <option value="loc-1" data-location-id="loc-1">Kuchnia Centralna</option>
      <option value="loc-2" data-location-id="loc-2">Punkt #1</option>
    </select>

    <button data-action="clock-in" type="submit">
      Zarejestruj wejście
    </button>
  </form>

  <!-- Lista aktywnych pracowników -->
  <section data-section="active-employees">
    <h2>Aktualnie w pracy</h2>
    <ul>
      <li data-employee-id="emp-1" data-status="active">
        <span data-field="employee-name">Anna Kowalska</span>
        <span data-field="clock-in-time">08:00</span>
        <span data-field="hours-worked">6h 30m</span>
        <button data-action="clock-out" data-employee-id="emp-1">
          Zakończ zmianę
        </button>
      </li>
    </ul>
  </section>
</div>
```

---

## 10. INTEGRACJE

### 10.1 Integracja z Aplikacją Mobilną (REST API)

#### 10.1.1 Architektura Integracji

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APLIKACJA KLIENTA (Twoja App)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Ekran Menu  │  │  Koszyk      │  │  Śledzenie Zamówienia    │   │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘   │
│         │                 │                      │                   │
│         └─────────────────┴──────────────────────┘                   │
│                           │                                         │
│                    REST API / WebSocket                              │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                    SYSTEM POS (Next.js + Supabase)                   │
│  ┌────────────────────────┴──────────────────────────────────────┐  │
│  │                    REST API (Next.js API Routes)               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │
│  │  │ /api/v1/menu│  │ /api/v1/    │  │ /api/v1/orders          │ │  │
│  │  │             │  │   auth      │  │                         │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │                    Supabase (PostgreSQL + Realtime)            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │
│  │  │   menu      │  │   orders    │  │   customers             │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 10.1.2 Autentykacja

##### Metody Autentykacji

| Metoda | Zastosowanie | Opis |
|--------|--------------|------|
| **JWT (Supabase Auth)** | Użytkownicy aplikacji | Standardowa autentykacja klientów |
| **API Key** | Aplikacja → POS | Stały klucz dla Twojej aplikacji |
| **Webhook Secret** | POS → Aplikacja | Weryfikacja webhooków |

##### Nagłówki Autentykacji

```http
# Dla endpointów wymagających autentykacji użytkownika
GET /api/v1/orders/my
Authorization: Bearer <jwt_token>
X-API-Key: <your_app_api_key>

# Dla webhooków z POS do aplikacji
POST https://twoja-apka.pl/webhooks/pos/order-status
X-POS-Signature: <hmac_signature>
X-POS-Event: order.status_changed
```

##### Generowanie API Key

```typescript
// W panelu admina POS generujesz klucz dla swojej aplikacji
{
  "api_key": "pos_live_abc123xyz789",
  "name": "Moja Aplikacja Zamawiania",
  "permissions": ["menu:read", "orders:write", "orders:read"],
  "allowed_ips": ["123.45.67.89"],  // opcjonalnie
  "webhook_url": "https://twoja-apka.pl/webhooks/pos"
}
```

#### 10.1.3 Endpointy API - Szczegółowa Dokumentacja

---

##### **MENU I PRODUKTY**

###### GET /api/v1/menu/categories

Pobiera listę kategorii menu.

**Parametry zapytania:**
| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `point_id` | UUID | Tak | ID punktu sprzedaży |
| `include_inactive` | boolean | Nie | Czy pokazać nieaktywne (default: false) |

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Burgery",
      "description": "Świeże burgery z wołowiny",
      "sort_order": 1,
      "image_url": "https://cdn.twojadomena.pl/categories/burgery.jpg",
      "products_count": 12
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Frytki i dodatki",
      "description": "Chrupiące frytki i sosy",
      "sort_order": 2,
      "image_url": null,
      "products_count": 8
    }
  ],
  "meta": {
    "total": 2,
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

---

###### GET /api/v1/menu/products

Pobiera listę produktów z menu.

**Parametry zapytania:**
| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `point_id` | UUID | Tak | ID punktu sprzedaży |
| `category_id` | UUID | Nie | Filtrowanie po kategorii |
| `include_unavailable` | boolean | Nie | Czy pokazać niedostępne (default: false) |
| `search` | string | Nie | Wyszukiwanie po nazwie |

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "sku": "BUR-001",
      "name": "Cheeseburger",
      "description": "Wołowina, ser cheddar, sałata, pomidor, sos",
      "category_id": "550e8400-e29b-41d4-a716-446655440000",
      "images": [
        {
          "url": "https://cdn.twojadomena.pl/products/cheeseburger.jpg",
          "alt": "Cheeseburger"
        }
      ],
      "variants": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440011",
          "name": "Mały",
          "price": 24.99,
          "weight_grams": 200,
          "is_available": true
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440012",
          "name": "Duży",
          "price": 34.99,
          "weight_grams": 350,
          "is_available": true
        }
      ],
      "modifiers": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "Dodatkowy ser",
          "price": 3.00,
          "max_quantity": 3
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440021",
          "name": "Bekon",
          "price": 5.00,
          "max_quantity": 2
        }
      ],
      "allergens": ["gluten", "milk", "eggs"],
      "nutritional_info": {
        "calories": 450,
        "protein": 25,
        "carbs": 35,
        "fat": 22
      },
      "preparation_time_minutes": 12,
      "is_available": true,
      "is_featured": true,
      "tags": ["bestseller", "klasyk"]
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "per_page": 20,
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

---

###### GET /api/v1/menu/availability

Sprawdza dostępność produktów w danym punkcie (real-time).

**Parametry zapytania:**
| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `point_id` | UUID | Tak | ID punktu sprzedaży |
| `product_ids` | UUID[] | Nie | Lista ID produktów do sprawdzenia |

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "point_id": "550e8400-e29b-41d4-a716-446655440100",
    "updated_at": "2024-01-15T14:30:00Z",
    "products": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440010",
        "is_available": true,
        "reason": null,
        "estimated_restock": null
      },
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440015",
        "is_available": false,
        "reason": "out_of_stock",
        "estimated_restock": "2024-01-15T18:00:00Z"
      }
    ]
  }
}
```

---

##### **ZAMÓWIENIA**

###### POST /api/v1/orders

Tworzy nowe zamówienie.

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-API-Key: <your_app_api_key>
```

**Request Body:**
```json
{
  "point_id": "550e8400-e29b-41d4-a716-446655440100",
  "channel": "delivery",
  "customer": {
    "id": "550e8400-e29b-41d4-a716-446655440200",  // lub null dla gościa
    "phone": "+48123456789",
    "email": "klient@example.com",
    "first_name": "Jan",
    "last_name": "Kowalski"
  },
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440010",
      "variant_id": "550e8400-e29b-41d4-a716-446655440012",
      "quantity": 2,
      "modifiers": [
        {
          "modifier_id": "550e8400-e29b-41d4-a716-446655440020",
          "quantity": 1
        }
      ],
      "notes": "Bez cebuli"
    },
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440030",
      "quantity": 1
    }
  ],
  "delivery_address": {
    "street": "ul. Marszałkowska 100",
    "city": "Warszawa",
    "zip": "00-001",
    "floor": "3",
    "apartment": "15",
    "notes": "Domofon 123"
  },
  "payment": {
    "method": "online",  // online, cash, card_on_delivery
    "stripe_payment_intent_id": "pi_3O..."  // jeśli płatność online
  },
  "notes": "Proszę o szybką dostawę",
  "scheduled_for": null,  // null = jak najszybciej, lub ISO datetime
  "promo_code": "WELCOME15"  // opcjonalnie
}
```

**Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "order_number": "ZAM-20240115-001",
    "status": "pending",
    "status_history": [
      {
        "status": "pending",
        "timestamp": "2024-01-15T14:30:00Z",
        "note": "Zamówienie utworzone"
      }
    ],
    "customer": {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "phone": "+48123456789",
      "first_name": "Jan"
    },
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440301",
        "product_id": "550e8400-e29b-41d4-a716-446655440010",
        "product_name": "Cheeseburger",
        "variant_name": "Duży",
        "quantity": 2,
        "unit_price": 34.99,
        "modifiers_price": 3.00,
        "total_price": 72.98
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440302",
        "product_id": "550e8400-e29b-41d4-a716-446655440030",
        "product_name": "Frytki",
        "quantity": 1,
        "unit_price": 12.99,
        "total_price": 12.99
      }
    ],
    "subtotal": 85.97,
    "delivery_fee": 5.99,
    "discount": -12.90,
    "total": 79.06,
    "estimated_ready_time": "2024-01-15T15:00:00Z",
    "estimated_delivery_time": "2024-01-15T15:30:00Z",
    "delivery_address": {
      "street": "ul. Marszałkowska 100",
      "city": "Warszawa",
      "zip": "00-001"
    },
    "created_at": "2024-01-15T14:30:00Z"
  }
}
```

**Response 400 Bad Request (błąd walidacji):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane zamówienia",
    "details": [
      {
        "field": "items[0].quantity",
        "message": "Ilość musi być większa od 0"
      },
      {
        "field": "delivery_address",
        "message": "Adres dostawy jest wymagany dla kanału 'delivery'"
      }
    ]
  }
}
```

**Response 422 Unprocessable Entity (produkt niedostępny):**
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_UNAVAILABLE",
    "message": "Jeden lub więcej produktów jest niedostępnych",
    "details": {
      "unavailable_items": [
        {
          "product_id": "550e8400-e29b-41d4-a716-446655440015",
          "product_name": "Nuggetsy",
          "reason": "out_of_stock"
        }
      ]
    }
  }
}
```

---

###### GET /api/v1/orders/{order_id}

Pobiera szczegóły zamówienia.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "order_number": "ZAM-20240115-001",
    "status": "preparing",
    "status_history": [
      {
        "status": "pending",
        "timestamp": "2024-01-15T14:30:00Z",
        "note": "Zamówienie utworzone"
      },
      {
        "status": "confirmed",
        "timestamp": "2024-01-15T14:31:00Z",
        "note": "Płatność potwierdzona"
      },
      {
        "status": "preparing",
        "timestamp": "2024-01-15T14:35:00Z",
        "note": "Kuchnia rozpoczęła przygotowanie"
      }
    ],
    "items": [...],
    "total": 79.06,
    "estimated_ready_time": "2024-01-15T15:00:00Z",
    "estimated_delivery_time": "2024-01-15T15:30:00Z",
    "actual_ready_time": null,
    "actual_delivery_time": null,
    "created_at": "2024-01-15T14:30:00Z"
  }
}
```

---

###### GET /api/v1/orders/{order_id}/status-history

Pobiera historię statusów zamówienia.

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "status": "pending",
      "timestamp": "2024-01-15T14:30:00Z",
      "note": "Zamówienie utworzone",
      "changed_by": "system"
    },
    {
      "status": "confirmed",
      "timestamp": "2024-01-15T14:31:00Z",
      "note": "Płatność potwierdzona",
      "changed_by": "system"
    },
    {
      "status": "preparing",
      "timestamp": "2024-01-15T14:35:00Z",
      "note": "Kuchnia rozpoczęła przygotowanie",
      "changed_by": "Kucharz Jan"
    }
  ]
}
```

---

###### PATCH /api/v1/orders/{order_id}/cancel

Anuluje zamówienie (tylko przez klienta, w określonym czasie).

**Request Body:**
```json
{
  "reason": "Zmiana planów",
  "reason_code": "changed_mind"  // changed_mind, wrong_address, other
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "status": "cancelled",
    "cancelled_at": "2024-01-15T14:32:00Z",
    "refund_amount": 79.06,
    "refund_status": "processing"
  }
}
```

---

##### **KLIENCI**

###### GET /api/v1/customers/me

Pobiera profil zalogowanego klienta.

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "phone": "+48123456789",
    "email": "klient@example.com",
    "first_name": "Jan",
    "last_name": "Kowalski",
    "birth_date": "1990-05-15",
    "loyalty": {
      "tier": "silver",
      "points": 1250,
      "points_to_next_tier": 250
    },
    "addresses": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440201",
        "street": "ul. Marszałkowska 100",
        "city": "Warszawa",
        "zip": "00-001",
        "is_default": true
      }
    ],
    "preferences": {
      "allergens": ["orzechy"],
      "favorite_products": ["550e8400-e29b-41d4-a716-446655440010"]
    },
    "order_history": {
      "total_orders": 45,
      "total_spent": 3456.78,
      "average_order_value": 76.82
    }
  }
}
```

---

###### GET /api/v1/customers/me/orders

Pobiera historię zamówień klienta.

**Parametry zapytania:**
| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `page` | number | Nie | Numer strony (default: 1) |
| `per_page` | number | Nie | Ilość na stronę (default: 10) |
| `status` | string | Nie | Filtrowanie po statusie |

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440300",
      "order_number": "ZAM-20240115-001",
      "status": "delivered",
      "total": 79.06,
      "items_count": 3,
      "created_at": "2024-01-15T14:30:00Z",
      "delivered_at": "2024-01-15T15:28:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "per_page": 10,
    "total_pages": 5
  }
}
```

---

#### 10.1.4 Webhooki (POS → Twoja Aplikacja)

System POS wysyła webhooki do Twojej aplikacji przy zmianach statusów zamówień.

##### Konfiguracja Webhooka

W panelu admina POS ustawiasz:

```json
{
  "webhook_url": "https://twoja-apka.pl/webhooks/pos",
  "secret": "whsec_twoj_tajny_klucz",
  "events": [
    "order.created",
    "order.status_changed",
    "order.cancelled",
    "order.delivered"
  ]
}
```

##### Payload Webhooka

```http
POST https://twoja-apka.pl/webhooks/pos
Content-Type: application/json
X-POS-Signature: sha256=abc123...
X-POS-Event: order.status_changed
X-POS-Delivery: 123e4567-e89b-12d3-a456-426614174000
```

```json
{
  "event": "order.status_changed",
  "timestamp": "2024-01-15T14:35:00Z",
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440300",
    "order_number": "ZAM-20240115-001",
    "previous_status": "confirmed",
    "new_status": "preparing",
    "changed_by": {
      "type": "user",
      "id": "550e8400-e29b-41d4-a716-446655440500",
      "name": "Kucharz Jan"
    },
    "note": "Kuchnia rozpoczęła przygotowanie",
    "estimated_ready_time": "2024-01-15T15:00:00Z"
  }
}
```

##### Weryfikacja Podpisu Webhooka (Node.js)

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// W handlerze webhooka
app.post('/webhooks/pos', (req, res) => {
  const signature = req.headers['x-pos-signature'];
  const secret = process.env.POS_WEBHOOK_SECRET;

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Przetwórz webhook
  const event = req.headers['x-pos-event'];
  const data = req.body.data;

  switch (event) {
    case 'order.status_changed':
      // Wyślij push notification do klienta
      notifyCustomer(data.order_id, data.new_status);
      break;
    // ... inne eventy
  }

  res.status(200).json({ received: true });
});
```

---

#### 10.1.5 Real-time Updates (WebSocket / Supabase Realtime)

Dla aktualizacji w czasie rzeczywistym (np. status zamówienia) możesz użyć Supabase Realtime.

##### Subskrypcja Zmian Zamówienia (JavaScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://twoj-projekt.supabase.co',
  'public-anon-key'
);

// Subskrybuj zmiany dla konkretnego zamówienia
const subscription = supabase
  .channel('order-550e8400-e29b-41d4-a716-446655440300')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: 'id=eq.550e8400-e29b-41d4-a716-446655440300'
    },
    (payload) => {
      console.log('Zamówienie zaktualizowane:', payload.new);
      // Zaktualizuj UI aplikacji
      updateOrderStatus(payload.new.status);
    }
  )
  .subscribe();
```

---

#### 10.1.6 Synchronizacja Menu

| Element | Kierunek | Częstotliwość | Mechanizm |
|---------|----------|---------------|-----------|
| Struktura menu | KC → Aplikacja | Na żądanie | REST API |
| Produkty | KC → Aplikacja | Real-time / co 5 min | REST API + Cache |
| Ceny | KC → Aplikacja | Real-time | Supabase Realtime |
| Dostępność | POS → Aplikacja | Real-time | Supabase Realtime |
| Promocje | KC → Aplikacja | Real-time | Supabase Realtime |

---

#### 10.1.7 Kluczowe Endpointy API - Podsumowanie

```
# MENU
GET    /api/v1/menu/categories              # Lista kategorii
GET    /api/v1/menu/products                # Lista produktów
GET    /api/v1/menu/availability            # Dostępność produktów (real-time)

# ZAMÓWIENIA
POST   /api/v1/orders                       # Tworzenie zamówienia
GET    /api/v1/orders/{id}                  # Szczegóły zamówienia
GET    /api/v1/orders/{id}/status-history   # Historia statusów
PATCH  /api/v1/orders/{id}/cancel           # Anulowanie zamówienia

# KLIENCI
GET    /api/v1/customers/me                 # Profil klienta
GET    /api/v1/customers/me/orders          # Historia zamówień
PATCH  /api/v1/customers/me                 # Aktualizacja profilu

# LOJALNOŚĆ
GET    /api/v1/loyalty/points               # Punkty lojalnościowe
GET    /api/v1/loyalty/rewards              # Dostępne nagrody
POST   /api/v1/loyalty/redeem               # Wymiana punktów
```

### 10.2 Systemy Płatności

| Dostawca | Prowizja | Rekomendacja |
|----------|----------|--------------|
| **Stripe** | 1.5% + 0.30€ | ⭐⭐⭐⭐⭐ |
| **PayU** | 1.2-2.0% | ⭐⭐⭐⭐ |
| **Tpay** | 1.2-1.9% | ⭐⭐⭐⭐ |

### 10.3 Dostawcy SMS

| Dostawca | Cena/SMS |
|----------|----------|
| **SMSAPI** | 0.06-0.08 PLN |
| **Twilio** | 0.05-0.10 USD |

### 10.4 Email

| Dostawca | Cena | Rekomendacja |
|----------|------|--------------|
| **SendGrid** | 100/dzień free | ⭐⭐⭐⭐⭐ |
| **Mailgun** | 5000/mies free | ⭐⭐⭐⭐ |

### 10.5 Systemy Księgowe

| System | Metoda |
|--------|--------|
| **wfirma.pl** | API |
| **inFakt** | API |
| **Comarch ERP** | API/CSV |

### 10.6 Platformy Delivery (Przyszłość)

| Platforma | API Dostępne |
|-----------|--------------|
| **Uber Eats** | Tak |
| **Wolt** | Tak |
| **Glovo** | Tak |
| **Pyszne.pl** | Tak |

### 10.7 Funkcje - Integracje

| ID | Funkcja | Opis | Priorytet |
|----|---------|------|-----------|
| INT-001 | REST API dla aplikacji | Pełne API dla aplikacji mobilnej | Wysoki |
| INT-002 | WebSocket real-time | Statusy zamówień w czasie rzeczywistym | Wysoki |
| INT-003 | Webhooki | Callbacki do aplikacji klienckiej | Wysoki |
| INT-004 | Integracja Stripe | Płatności online | Wysoki |
| INT-005 | Integracja SMSAPI | Powiadomienia SMS | Wysoki |
| INT-006 | Integracja SendGrid | Emaile transakcyjne | Wysoki |
| INT-007 | Integracja księgowa | Eksport do ERP | Średni |
| INT-008 | Platformy delivery | Uber Eats, Wolt, Glovo | Niski |

---

## 11. INNOWACJE I AI

### 11.1 Roadmapa Wdrożenia AI

#### Faza 1: Szybkie Wygrane (0-3 miesiące)

| # | Zastosowanie | Trudność | Korzyść | Szacunkowy czas |
|---|--------------|----------|---------|-----------------|
| 1 | Analiza sentymentu opinii | ŁATWY | ŚREDNIA | 1-2 tygodnie |
| 2 | Automatyczne generowanie opisów | ŁATWY | ŚREDNIA | 1 tydzień |
| 3 | Segmentacja klientów | ŁATWY | WYSOKA | 2-3 tygodnie |
| 4 | Wykrywanie błędów w recepturach | ŁATWY | WYSOKA | 2 tygodnie |

#### Faza 2: Core AI (3-6 miesięcy)

| # | Zastosowanie | Trudność | Korzyść | Szacunkowy czas |
|---|--------------|----------|---------|-----------------|
| 5 | Prognozowanie sprzedaży | ŚREDNI | WYSOKA | 4-6 tygodni |
| 6 | Sugestie ilości półproduktów | ŁATWY | WYSOKA | 2-3 tygodnie |
| 7 | System rekomendacji produktów | ŚREDNI | WYSOKA | 4-5 tygodni |
| 8 | Personalizowane menu | ŚREDNI | WYSOKA | 3-4 tygodnie |
| 9 | Chatbot do obsługi klienta | ŚREDNI | ŚREDNIA | 4-6 tygodni |

#### Faza 3: Zaawansowane (6-12 miesięcy)

| # | Zastosowanie | Trudność | Korzyść | Szacunkowy czas |
|---|--------------|----------|---------|-----------------|
| 10 | Dynamiczne ceny | TRUDNY | WYSOKA | 6-8 tygodni |
| 11 | Predykcja churn | ŚREDNI | WYSOKA | 4-5 tygodni |
| 12 | Optymalizacja tras dostaw | ŚREDNI | ŚREDNIA | 4-5 tygodni |
| 13 | Predykcja czasu realizacji | ŚREDNI | ŚREDNIA | 3-4 tygodnie |

### 11.2 Szczegółowy Opis AI

#### Prognozowanie Sprzedaży

**Technologia:** Prophet (Facebook) lub LSTM

**Cechy wejściowe:**
- Historyczna sprzedaż (6-12 miesięcy)
- Dzień tygodnia, pora roku, święta
- Dane pogodowe (API: OpenWeatherMap)
- Wydarzenia lokalne

**Korzyści biznesowe:**
- Redukcja marnowania żywności o 15-25%
- Optymalizacja zatrudnienia
- Szacowana oszczędność: 5-10% kosztów operacyjnych

#### System Rekomendacji Produktów

**Technologia:** ALS (Alternating Least Squares) lub Neural Collaborative Filtering

**Korzyści biznesowe:**
- Wzrost średniego koszyka o 10-20%
- Lepsze wykorzystanie cross-sellingu

#### Personalizowane Menu

**Technologia:** Ranking learning-to-rank (LightGBM, XGBoost)

**Scenariusze:**
- Wegetarianin widzi dania wegetariańskie na górze
- Klient zamawiający rano kawę - kawa jako pierwsza propozycja
- Dla klienta "słodkiego" - desery wyróżnione

**Korzyści biznesowe:**
- Wzrost konwersji o 15-25%
- Lepsze doświadczenie użytkownika

#### Dynamiczne Ceny

**Technologia:** Reinforcement Learning (Multi-Armed Bandit)

**Czynniki wpływające na cenę:**
- Aktualny popyt (queue length)
- Stan zapasów (produkty blisko przeterminowania)
- Pora dnia (happy hour automatyczny)
- Pogoda

**Korzyści biznesowe:**
- Wzrost marży o 5-15%
- Redukcja marnowania żywności

#### Analiza Sentymentu Opinii

**Technologia:** BERT sentiment analysis (polishBERT)

**Funkcjonalności:**
- Klasyfikacja opinii (pozytywna/negatywna/neutralna)
- Ekstrakcja aspektów (smak, obsługa, czas dostawy)
- Alert przy nagłym spadku ocen

#### Predykcja Churn

**Technologia:** Gradient Boosting (XGBoost, LightGBM)

**Kluczowe metryki (RFM):**
- Recency: czas od ostatniego zamówienia
- Frequency: liczba zamówień w okresie
- Monetary: wartość zamówień

**Korzyści biznesowe:**
- Redukcja churn rate o 15-30%
- Proaktywne działania retention

#### Chatbot do Obsługi Klienta

**Technologia:** RAG (Retrieval-Augmented Generation) z GPT-4/Claude

**Funkcjonalności:**
- Sprawdzenie statusu zamówienia
- Informacje o alergenach i składnikach
- Godziny otwarcia i lokalizacje
- Problemy z zamówieniem (eskalowanie do człowieka)

**Korzyści biznesowe:**
- Redukcja obciążenia infolinii o 40-60%
- Dostępność 24/7

### 11.3 Oczekiwane Efekty po 12 Miesiącach

| Metryka | Oczekiwana zmiana |
|---------|-------------------|
| Redukcja marnowania żywności | 15-25% |
| Wzrost średniego koszyka | 10-20% |
| Redukcja churn rate | 15-30% |
| Oszczędność czasu personelu | 2-3h dziennie |
| Wzrost marży | 5-15% |
| Redukcja kosztów operacyjnych | 5-10% |

### 11.4 Stack Technologiczny AI

| Komponent | Technologia | Uwagi |
|-----------|-------------|-------|
| **ML/AI** | TensorFlow.js, XGBoost (Python API) | TF.js dla modeli w przeglądarce, XGBoost dla backend |
| **NLP** | Hugging Face Transformers, OpenAI API | OpenAI dla szybkich wdrożeń, HF dla custom |
| **Rekomendacje** | TensorFlow Recommenders, Surprise | TF-RS dla dużych modeli |
| **Deployment** | Next.js API Routes, Vercel Edge Functions | Edge Functions dla niskiego latency |
| **Monitoring** | Vercel Analytics, Custom Dashboard | Wbudowane metryki Vercel + custom |
| **Database ML** | Supabase + pgvector | Wektorowa baza dla RAG/embedding |

---

## 12. PRIORYTETY WDROŻENIA

### 12.1 Faza 0: Przygotowanie (Tydzień 1-2)

```
□ Utworzenie repozytorium i struktury projektu
□ Konfiguracja środowiska developerskiego (Docker)
□ Ustawienie CI/CD pipeline (GitHub Actions)
□ Konfiguracja monitoringu i logowania
□ Przygotowanie środowiska staging
□ Utworzenie dokumentacji API (Swagger/OpenAPI)
```

### 12.2 Faza 1: MVP - Core System (Tydzień 3-10)

**Moduły MVP:**

```
□ UserModule (autentykacja, role)
□ MenuModule (produkty, kategorie, ceny)
□ OrderModule (zamówienia, statusy)
□ KitchenModule (kolejka kuchenna KDS)
□ Basic InventoryModule (stany magazynowe, alerty)
□ EmployeeModule (pracownicy, rejestracja czasu pracy)
□ Basic frontend (dashboard POS)
```

**Integracje MVP:**

```
□ Autentykacja JWT
□ Podstawowe API REST dla aplikacji
□ WebSocket dla real-time
□ Integracja Stripe (płatności)
□ Integracja SMSAPI (powiadomienia)
```

**Deliverables MVP:**
- Działający system POS w lokalu testowym
- Możliwość składania zamówień z aplikacji
- Kolejka kuchenna KDS
- Podstawowe raporty

### 12.3 Faza 2: Rozszerzenie (Tydzień 11-16)

```
□ Pełny InventoryModule (dostawy, inwentaryzacja)
□ CRMModule (klienci, lojalność podstawowa)
□ ReportingModule (pełne raporty)
□ PWA dla dashboardu kierownika
□ Spis magazynowy na telefonie
```

### 12.4 Faza 3: AI i Optymalizacja (Tydzień 17-24)

```
□ Prognozowanie sprzedaży
□ System rekomendacji produktów
□ Analiza sentymentu opinii
□ Segmentacja klientów
□ Chatbot do obsługi klienta
```

### 12.5 Faza 4: Skalowanie (Tydzień 25-30)

```
□ Performance testing i optymalizacja
□ Security audit i hardening
□ Konfiguracja backupów i DR
□ Dokumentacja operacyjna
□ Szkolenie zespołu
```

### 12.6 Timeline Podsumowanie

```
Tydzień 1-2:   ████ Przygotowanie
Tydzień 3-10:  ████████████████████ MVP - Core System (8 tyg)
Tydzień 11-16: ██████████████ Rozszerzenie (6 tyg)
Tydzień 17-24: ████████████████████ AI i Optymalizacja (8 tyg)
Tydzień 25-30: ██████████████ Skalowanie (6 tyg)

Total: ~30 tygodni (7-8 miesięcy) dla zespołu 2-3 developerów
```

---

## 13. WYKAZ FUNKCJI

### 13.1 Legenda Priorytetów

| Priorytet | Oznaczenie | Opis |
|-----------|------------|------|
| **Wysoki** | P0 | Funkcje krytyczne dla MVP |
| **Średni** | P1 | Funkcje ważne, ale nie blokujące |
| **Niski** | P2 | Funkcje nice-to-have |

### 13.2 Podsumowanie Funkcji według Modułów

| Moduł | Wysoki (P0) | Średni (P1) | Niski (P2) | Razem |
|-------|-------------|-------------|------------|-------|
| Menu | 5 | 3 | 0 | 8 |
| Receptury | 5 | 2 | 0 | 7 |
| Magazyn | 12 | 2 | 0 | 14 |
| Zamówienia/KDS | 10 | 3 | 0 | 13 |
| CRM/Lojalność | 4 | 6 | 0 | 10 |
| Raportowanie | 7 | 2 | 0 | 9 |
| Pracownicy | 6 | 5 | 0 | 11 |
| Integracje | 5 | 2 | 1 | 8 |
| **RAZEM** | **54** | **25** | **1** | **80** |

### 13.3 Pełny Wykaz Funkcji

| ID | Funkcja | Moduł | Priorytet |
|----|---------|-------|-----------|
| MENU-001 | Tworzenie kategorii | Menu | Wysoki |
| MENU-002 | Edycja kategorii | Menu | Wysoki |
| MENU-003 | Tworzenie produktu | Menu | Wysoki |
| MENU-004 | Zarządzanie cenami | Menu | Wysoki |
| MENU-005 | Dostępność produktów | Menu | Wysoki |
| MENU-006 | Tworzenie promocji | Menu | Średni |
| MENU-007 | Happy Hours | Menu | Średni |
| MENU-008 | Zarządzanie modyfikatorami | Menu | Wysoki |
| REC-001 | Zarządzanie składnikami | Receptury | Wysoki |
| REC-002 | Alergeny | Receptury | Wysoki |
| REC-003 | Tworzenie receptury | Receptury | Wysoki |
| REC-004 | Edycja receptury | Receptury | Wysoki |
| REC-005 | Kalkulacja kosztów | Receptury | Wysoki |
| REC-006 | Składniki dzielone | Receptury | Średni |
| REC-007 | Porównanie wersji | Receptury | Średni |
| MAG-001 | Zarządzanie magazynami | Magazyn | Wysoki |
| MAG-002 | Zarządzanie produktami | Magazyn | Wysoki |
| MAG-003 | Zamówienia do dostawców | Magazyn | Wysoki |
| MAG-004 | Przyjęcie dostawy | Magazyn | Wysoki |
| MAG-005 | Przesunięcia między magazynami | Magazyn | Wysoki |
| MAG-006 | Stany magazynowe | Magazyn | Wysoki |
| MAG-007 | Alerty zapasów | Magazyn | Wysoki |
| MAG-008 | Log HACCP | Magazyn | Wysoki |
| MAG-009 | Rejestracja strat | Magazyn | Wysoki |
| MAG-010 | Inwentaryzacja | Magazyn | Wysoki |
| MAG-011 | Kalkulacja kosztów | Magazyn | Wysoki |
| MAG-012 | Automatyczne zamawianie | Magazyn | Średni |
| ORD-001 | Przyjmowanie zamówień | Zamówienia | Wysoki |
| ORD-002 | Szacowany czas realizacji | Zamówienia | Wysoki |
| ORD-003 | Zarządzanie kolejką | Zamówienia | Wysoki |
| ORD-004 | Anulowania i zwroty | Zamówienia | Wysoki |
| ORD-005 | Notatki do zamówień | Zamówienia | Średni |
| KDS-001 | Przyjmowanie zamówienia | KDS | Wysoki |
| KDS-002 | Rozpoczęcie przygotowania | KDS | Wysoki |
| KDS-003 | Oznaczenie jako gotowe | KDS | Wysoki |
| KDS-004 | Wydanie zamówienia | KDS | Wysoki |
| KDS-005 | Priorytetyzacja | KDS | Średni |
| KDS-006 | Widok grupowany | KDS | Średni |
| KDS-007 | Historia zamówień | KDS | Średni |
| CRM-001 | Baza klientów | CRM | Wysoki |
| CRM-002 | Segmentacja RFM | CRM | Średni |
| CRM-003 | System punktowy | CRM | Wysoki |
| CRM-004 | Poziomy lojalnościowe | CRM | Średni |
| CRM-005 | Katalog nagród | CRM | Średni |
| CRM-006 | Automatyczne kupony | CRM | Średni |
| CRM-007 | Powiadomienia statusów | CRM | Wysoki |
| CRM-008 | Kampanie marketingowe | CRM | Średni |
| CRM-009 | System opinii | CRM | Średni |
| CRM-010 | Reklamacje | CRM | Średni |
| RPT-001 | Dashboard zarządczy | Raportowanie | Wysoki |
| RPT-002 | Dashboard kierownika | Raportowanie | Wysoki |
| RPT-003 | Dashboard kuchni | Raportowanie | Wysoki |
| RPT-004 | Raporty sprzedażowe | Raportowanie | Wysoki |
| RPT-005 | Raporty operacyjne | Raportowanie | Wysoki |
| RPT-006 | Raporty finansowe | Raportowanie | Wysoki |
| RPT-007 | Raporty magazynowe | Raportowanie | Wysoki |
| RPT-008 | Eksport danych | Raportowanie | Średni |
| RPT-009 | Automatyczne raporty | Raportowanie | Średni |
| EMP-001 | Dodawanie pracownika | Pracownicy | Wysoki |
| EMP-002 | Edycja pracownika | Pracownicy | Wysoki |
| EMP-003 | Deaktywacja pracownika | Pracownicy | Wysoki |
| EMP-004 | Logowanie PIN/kodem | Pracownicy | Wysoki |
| EMP-005 | Rejestracja wejścia | Pracownicy | Wysoki |
| EMP-006 | Rejestracja wyjścia | Pracownicy | Wysoki |
| EMP-007 | Rejestracja przerwy | Pracownicy | Średni |
| EMP-008 | Widok aktywnych pracowników | Pracownicy | Wysoki |
| EMP-009 | Kalendarz pracownika | Pracownicy | Średni |
| EMP-010 | Edycja wpisów (manager) | Pracownicy | Średni |
| EMP-011 | Zatwierdzanie wpisów | Pracownicy | Średni |
| INT-001 | REST API dla aplikacji | Integracje | Wysoki |
| INT-002 | WebSocket real-time | Integracje | Wysoki |
| INT-003 | Webhooki | Integracje | Wysoki |
| INT-004 | Integracja Stripe | Integracje | Wysoki |
| INT-005 | Integracja SMSAPI | Integracje | Wysoki |
| INT-006 | Integracja SendGrid | Integracje | Wysoki |
| INT-007 | Integracja księgowa | Integracje | Średni |
| INT-008 | Platformy delivery | Integracje | Niski |

---

## ZAŁĄCZNIKI

### A. Pułapki do Unikania (z analizy rynku)

1. **Brak odpowiedniego planowania** - Wybieranie systemu bez analizy potrzeb
2. **Niedocenienie szkoleń** - Za krótkie wdrożenie, brak "POS champion"
3. **Zaniedbanie integracji** - Wybór zamkniętego systemu bez API
4. **Ignorowanie bezpieczeństwa** - Słabe hasła, brak MFA, brak backupów
5. **Nieaktualizowanie menu i cen** - Niezgodność z ofertą
6. **Brak kontroli inventory** - Nieśledzenie food costów
7. **Niewykorzystanie danych** - Brak analizy raportów

### B. Rekomendacje z Analizy Rynku

**Najlepsze praktyki z POSbistro:**
- Kitchen Display System (KDS) zamiast wydruków
- Aplikacja dla kierowców z nawigacją
- Centralne zarządzanie menu dla sieci
- Magazyn z recepturami i automatycznymi rozchodami

**Innowacje warte wdrożenia:**
- Ingredient-level inventory (śledzenie na poziomie składnika)
- AI-powered forecasting (prognozowanie popytu)
- QR Code Ordering (zamawianie bez obsługi)
- Self-Order Kiosks (większe średnie zamówienie)

### C. Szacunkowe Koszty

#### Infrastruktura (miesięcznie):

| Pozycja | Koszt |
|---------|-------|
| App Server (2x) | $24 |
| Database (managed) | $15 |
| Redis (managed) | $15 |
| S3 Storage | $5 |
| CDN (CloudFlare) | $0 (free) |
| **Razem** | **~$60/mies** |

#### Integracje (przy ~1000 zamówień/mies):

| Pozycja | Koszt |
|---------|-------|
| Stripe (1.5% + 0.30€) | ~$200 |
| SMSAPI (~500 SMS) | ~$30 |
| SendGrid | $0 (free tier) |
| **Razem** | **~$230/mies** |

#### AI (miesięcznie):

| Pozycja | Koszt |
|---------|-------|
| Serwery ML | $50-200 |
| API OpenAI | $50-200 |
| **Razem** | **~$100-400/mies** |

---

*Dokument wygenerowany: 2024*  
*Wersja: 1.0*  
*Status: Dokument wdrożeniowy gotowy do użycia przez zespoły deweloperskie*

---

**UWAGA:** Niniejsza specyfikacja jest dokumentem żywym i powinna być aktualizowana wraz z rozwojem projektu oraz zmianami wymagań biznesowych.
