# MESO - Smart Asian Comfort | Specyfikacja Aplikacji PWA

> **Dokument przeznaczony dla AI Agent / Developer**
> Wersja: 2.0 (dostosowana do MESO)
> Data: Luty 2026
> Projekt: Aplikacja PWA do zamawiania japońskiego comfort food z dostawą

---

## 🍜 O MESO

**MESO** to innowacyjny koncept franczyzowy definiujący nową kategorię rynkową: **"Smart Asian Comfort"**.

**Misja:** Dostarczać Polakom autentyczne, emocjonujące doznania kulinarne w wygodny i przystępny cenowo sposób.

**Wizja:** Pierwsza ogólnopolska, powszechnie rozpoznawalna marka w segmencie premium japońskiego street foodu.

### Czym jest "Smart Asian Comfort"?

- **Jakość i Autentyczność:** Smak, składniki i receptury na poziomie najlepszych restauracji
- **Komfort i Dostępność:** Uczciwa cena, która pozwala traktować nasz produkt jako codzienną przyjemność
- **Smart = Inteligentny model biznesowy:** Oszczędzamy na czynszu i personelu, inwestujemy w produkt

### Model operacyjny

```
┌─────────────────────────────────────────────────────────────┐
│                    CENTRALNA KUCHNIA                        │
│    (Produkcja: bulionu, marynat, sosów, pakowanie)         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ Punkt 1 │ │ Punkt 2 │ │ Punkt 3 │
              │ (Gdańsk)│ │(Warszawa│ │ (Kraków)│
              │  🚚     │ │   🚚    │ │   🚚    │
              └─────────┘ └─────────┘ └─────────┘
                  │           │           │
                  ▼           ▼           ▼
              Delivery    Delivery    Delivery
```

---

## 1. Przegląd projektu

### 1.1 Cel aplikacji

Aplikacja PWA dla sieci MESO umożliwiająca:
- Przeglądanie menu z autorskimi pozycjami japońskiego comfort food
- Składanie zamówień z dostawą (delivery-first model)
- Płatności online (BLIK, karty, Przelewy24)
- Śledzenie kuriera w czasie rzeczywistym
- Program lojalnościowy "MESO Club"
- Obsługa wielu lokalizacji franczyzowych

### 1.2 Klient docelowy: "Miejski Odkrywca"

| Cecha | Opis |
|-------|------|
| **Wiek** | 30-45 lat |
| **Profil** | Nowoczesny profesjonalista z dużego miasta |
| **Styl życia** | Pracownik centrum biurowego, freelancer, manager |
| **Wartości** | Ceni czas, jakość, autentyczność |
| **Zachowania** | Zamawia lunch do biura, kolację do domu przez aplikacje |
| **Oczekiwania** | Gotów zapłacić za wysokiej jakości, autentyczny posiłek |

### 1.3 Użytkownicy systemu

| Rola | Opis | Dostęp |
|------|------|--------|
| **Klient** | Zamawiający jedzenie | Aplikacja PWA |
| **Operator punktu** | Jednoosobowa obsługa food trucka | Tablet z "Kucharzem Cyfrowym" |
| **Manager lokalizacji** | Zarządza punktem | Panel Admin |
| **Centrala (Super Admin)** | Zarządza siecią | Panel Admin |
| **Kurier** | Realizuje dostawy | SMS/WhatsApp |

### 1.4 Platformy i urządzenia

> **KLUCZOWE:** Aplikacja MUSI działać jako pełnoprawna aplikacja na WSZYSTKICH platformach

#### Wspierane platformy

| Platforma | Typ | Wymagania |
|-----------|-----|-----------|
| **Desktop Web** | Strona responsywna | Chrome, Firefox, Safari, Edge (ostatnie 2 wersje) |
| **Mobile Web** | Strona responsywna | Chrome Mobile, Safari iOS, Samsung Internet |
| **Mobile PWA** | Instalowalna aplikacja | Android 8+, iOS 14+ |
| **Tablet** | Strona responsywna + PWA | iPad, Android tablets |

#### Responsywne breakpointy (Tailwind CSS)

```typescript
// tailwind.config.ts
const config = {
  theme: {
    screens: {
      'xs': '375px',   // Mobile małe (iPhone SE)
      'sm': '640px',   // Mobile duże
      'md': '768px',   // Tablet portrait
      'lg': '1024px',  // Tablet landscape / Desktop mały
      'xl': '1280px',  // Desktop
      '2xl': '1536px', // Desktop duży
    },
  },
}
```

#### Design responsywny - wytyczne

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           DESKTOP (lg+)                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Logo    [Lokalizacja ▼]    Szukaj...    🛒 Koszyk    [👤 Konto]    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────┐ ┌──────────────────────────────────────────────────────┐  │
│  │            │ │                                                      │  │
│  │   Sidebar  │ │                  Content Grid                        │  │
│  │  Kategorie │ │               (3-4 kolumny produktów)                │  │
│  │            │ │                                                      │  │
│  └────────────┘ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│        MOBILE (< md)            │
│  ┌─────────────────────────────┐│
│  │ ☰  MESO   📍 Gdańsk   🛒 3 ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Ramen | Gyoza | Karaage    ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │  ┌───────┐ ┌───────┐       ││
│  │  │Product│ │Product│       ││
│  │  │ Card  │ │ Card  │       ││
│  │  └───────┘ └───────┘       ││
│  │  ┌───────┐ ┌───────┐       ││
│  │  │Product│ │Product│       ││
│  │  │ Card  │ │ Card  │       ││
│  │  └───────┘ └───────┘       ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 🏠  📋  🛒  👤             ││ ← Bottom Navigation
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

#### PWA - Wymagania techniczne

**Manifest (manifest.json):**

```json
{
  "name": "MESO - Smart Asian Comfort",
  "short_name": "MESO",
  "description": "Zamów japońskie comfort food z dostawą",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F0F0F",
  "theme_color": "#C41E3A",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-menu.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/desktop-menu.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "categories": ["food", "lifestyle"],
  "lang": "pl-PL"
}
```

**Service Worker - funkcjonalności:**

```typescript
// sw.ts - Service Worker requirements
const SW_FEATURES = {
  // Cache strategies
  caching: {
    static: 'cache-first',      // CSS, JS, images
    api: 'network-first',       // /api/* endpoints
    images: 'stale-while-revalidate', // Product images
  },

  // Offline support
  offline: {
    showOfflinePage: true,      // /offline.html
    cacheMenu: true,            // Menu dostępne offline
    queueOrders: true,          // Zamówienia w kolejce gdy offline
  },

  // Push notifications
  push: {
    enabled: true,
    provider: 'OneSignal',
  },

  // Background sync
  backgroundSync: {
    enabled: true,
    syncTag: 'meso-order-sync',
  },
};
```

**next-pwa konfiguracja:**

```typescript
// next.config.ts
import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(png|jpg|jpeg|webp|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
});

export default config;
```

#### Różnice UI między Desktop a Mobile

| Element | Desktop (lg+) | Mobile (< md) |
|---------|--------------|---------------|
| **Nawigacja** | Top navbar z wszystkimi linkami | Bottom navigation bar + hamburger menu |
| **Koszyk** | Flyout panel z prawej strony | Pełnoekranowy modal |
| **Menu produktów** | Grid 3-4 kolumny + sidebar kategorii | Grid 2 kolumny + horizontal scroll kategorii |
| **Strona produktu** | Modal/drawer z prawej strony | Pełnoekranowa strona |
| **Checkout** | Multi-step w jednej kolumnie centralnej | Pełnoekranowy flow krok po kroku |
| **Tracking zamówienia** | Split view: mapa + szczegóły | Tabs: mapa / szczegóły |
| **Panel konta** | Sidebar + content area | Pełnoekranowe podstrony |

#### Testowanie responsywności

```bash
# Chrome DevTools - predefiniowane urządzenia
# Testuj na każdym z poniższych:

DEVICES_TO_TEST = [
  "iPhone SE",           # 375x667
  "iPhone 14 Pro Max",   # 430x932
  "iPad",                # 768x1024
  "iPad Pro 12.9",       # 1024x1366
  "Desktop 1920x1080",   # Full HD
  "Desktop 2560x1440",   # 2K
]

# Każdy ekran aplikacji MUSI być przetestowany na wszystkich powyższych
```

#### Instalacja PWA - UX Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ MOBILE: Pierwsza wizyta                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Po 2 wizytach LUB po złożeniu zamówienia:                         │
│                                                                     │
│  ┌───────────────────────────────────────────────┐                 │
│  │  ┌─────┐                                      │                 │
│  │  │ 🍜 │  Dodaj MESO do ekranu głównego       │                 │
│  │  └─────┘                                      │                 │
│  │         Szybszy dostęp do ulubionych ramenów │                 │
│  │                                               │                 │
│  │         [Nie teraz]    [📲 Zainstaluj]       │                 │
│  └───────────────────────────────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ DESKTOP: Install prompt                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  W pasku adresu Chrome pojawi się ikona instalacji (+)             │
│  Dodatkowo: baner na dole strony po 3 wizytach                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🍜 Zainstaluj aplikację MESO - szybkie zamówienia!  [Zainstaluj]│
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Menu MESO

### 2.1 Filozofia menu

> **Celowo krótkie menu = mistrzowskie dopracowanie każdej pozycji**

Wszystkie dania bazują na:
- Autorskich recepturach Macieja Krawczuna
- Wysokiej jakości składnikach importowanych z Japonii i Chin
- Koncentratach przygotowanych w centralnej kuchni

### 2.2 Flagowe pozycje

#### 🍜 RAMEN

| ID | Produkt | Składniki | Cena* | Tagi |
|----|---------|-----------|-------|------|
| `ramen-spicy-miso` | **Spicy Miso** | Ostry bulion miso, makaron ramen, pikantne mięso mielone, czerwona cebula, edamame, świeże chilli, limonka, olej chilli | 36,90 zł | 🔥 Ostre, 🏆 Bestseller |
| `ramen-shoyu-chicken` | **Shoyu Kurczak** | Bulion shoyu, makaron ramen, kurczak Teriyaki, szczypiorek, menma, grzyby mung, olej smakowy | 34,90 zł | 🍗 Kurczak |
| `ramen-tonkotsu-chashu` | **Tonkotsu Chashu** | Bulion tonkotsu, makaron ramen, wieprzowina chashu, szczypiorek, kukurydza, prażony czosnek, olej smakowy | 38,90 zł | ⭐ Signature |
| `ramen-vege` | **Vege Ramen** | Wegański bulion, makaron ramen, grillowany daikon, szczypiorek, nori, olej smakowy | 32,90 zł | 🌱 Wegański |

#### 🥟 GYOZA (Pierożki japońskie)

| ID | Produkt | Opis | Cena* | Tagi |
|----|---------|------|-------|------|
| `gyoza-chicken` | **Gyoza Kurczak** | Smażone japońskie pierożki z kurczakiem i warzywami (6 szt.) | 24,90 zł | 🍗 Kurczak |
| `gyoza-shrimp` | **Gyoza Krewetka** | Japońskie pierożki z krewetkami i warzywami (6 szt.) | 28,90 zł | 🦐 Owoce morza |
| `gyoza-pork-duck` | **Gyoza Wieprzowina/Kaczka** | Klasyczne pierożki z wieprzowiną lub kaczką (6 szt.) | 26,90 zł | 🥢 Klasyk |
| `gyoza-vege` | **Gyoza Wege** | Pierożki z warzywami (6 szt.) | 22,90 zł | 🌱 Wegański |

#### 🍗 KARAAGE (Chrupiący kurczak)

| ID | Produkt | Składniki | Cena* | Tagi |
|----|---------|-----------|-------|------|
| `karaage-rice-spicy` | **Karaage Rice Spicy** | Ryż jaśminowy, kurczak karaage, sos spicy [MESO] mayo, cytryna, prażony sezam | 32,90 zł | 🔥 Ostre |
| `karaage-rice-teriyaki` | **Karaage Rice Teriyaki** | Ryż jaśminowy, kurczak karaage, sos Teriyaki, cytryna, prażony sezam | 32,90 zł | 🍯 Słodkie |
| `karaage-fries-spicy` | **Karaage Fries Spicy** | Frytki, kurczak karaage, czerwona cebula, sos spicy, prażony sezam | 34,90 zł | 🔥🍟 Ostre |
| `karaage-fries-teriyaki` | **Karaage Fries Teriyaki** | Frytki, kurczak karaage, czerwona cebula, sos Teriyaki, prażony sezam | 34,90 zł | 🍯🍟 Słodkie |

#### 🍚 DODATKI (Sides)

| ID | Produkt | Opis | Cena* |
|----|---------|------|-------|
| `side-coleslaw` | **Azjatycki Colesław** | Surówka coleslaw z pastą miso, olejem sezamowym i kolendrą | 12,90 zł |
| `side-egg` | **Jajko Marynowane** | Marynowane jajko ajitama | 5,00 zł |
| `side-spicy-mayo` | **Spicy Mayo** | Pikantny sos majonezowy z autorskimi składnikami MESO | 4,00 zł |
| `side-soboro-fries` | **Frytki Soboro** | Frytki z pikantnym mięsem mielonym, wieprzowiną chashu, piklami i majonezem truflowym | 24,90 zł |

#### 🥤 NAPOJE

| ID | Produkt | Cena* |
|----|---------|-------|
| `drink-ramune` | Ramune (japońska lemoniada) | 12,00 zł |
| `drink-matcha` | Matcha Latte (zimne/ciepłe) | 16,00 zł |
| `drink-hojicha` | Japońska herbata Hojicha | 9,00 zł |
| `drink-water` | Woda mineralna | 5,00 zł |
| `drink-cola` | Coca-Cola / Zero | 7,00 zł |

> *Ceny orientacyjne - do ustalenia finalnie przed launch*

### 2.3 Warianty i dodatki

#### Warianty dla Ramenów

| Wariant | Opis | Cena |
|---------|------|------|
| Standardowy | Porcja 400ml | bazowa |
| Duży (+150ml) | Porcja 550ml | +8,00 zł |

#### Dodatki do wszystkich dań

| Dodatek | Cena |
|---------|------|
| Jajko marynowane (ajitama) | +5,00 zł |
| Extra chashu (2 plastry) | +12,00 zł |
| Extra kurczak karaage (3 szt) | +10,00 zł |
| Extra makaron | +6,00 zł |
| Spicy mayo | +4,00 zł |
| Prażony czosnek | +3,00 zł |
| Edamame | +8,00 zł |

#### Poziomy ostrości (dla Spicy Miso i Karaage Spicy)

| Poziom | Ikona | Opis |
|--------|-------|------|
| 1 | 🔥 | Łagodny - delikatne ciepło |
| 2 | 🔥🔥 | Średni - wyraźna ostrość (rekomendowany) |
| 3 | 🔥🔥🔥 | Piekielny - tylko dla odważnych! |

### 2.4 Struktura danych menu

```typescript
// src/types/menu.ts

interface Product {
  id: string
  slug: string
  name: string
  name_jp?: string          // Nazwa japońska (np. "味噌ラーメン")
  description: string       // Krótki opis
  ingredients: string[]     // Lista składników
  story?: string            // Historia dania / cytat szefa kuchni

  price: number
  original_price?: number   // Cena przed promocją
  image_url: string
  category_id: string

  // Czas przygotowania
  prep_time_min: number     // Minimalny czas (min)
  prep_time_max: number     // Maksymalny czas (min)

  // Informacje dietetyczne
  calories?: number
  allergens: string[]       // ['gluten', 'soy', 'sesame', 'egg', 'crustaceans', 'shellfish']
  is_vegetarian: boolean
  is_vegan: boolean
  is_gluten_free: boolean
  is_spicy: boolean
  spice_level?: 1 | 2 | 3   // Poziom ostrości

  // Status
  is_signature: boolean     // Signature dish (Tonkotsu)
  is_bestseller: boolean    // Bestseller (Spicy Miso)
  is_new: boolean
  is_limited: boolean       // Limitowana edycja
  is_active: boolean

  // Customizacja
  has_variants: boolean     // np. rozmiary porcji
  has_addons: boolean       // np. extra składniki
  has_spice_level: boolean  // Można wybrać poziom ostrości

  // SEO / Marketing
  tags: string[]            // ['spicy', 'bestseller', 'vegan']

  sort_order: number
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  slug: string
  name: string
  name_jp?: string
  description?: string
  icon: string              // Emoji
  image_url?: string
  sort_order: number
  is_active: boolean
}

// Kategorie MESO
const CATEGORIES = [
  { slug: 'ramen', name: 'Ramen', name_jp: 'ラーメン', icon: '🍜', sort_order: 1 },
  { slug: 'gyoza', name: 'Gyoza', name_jp: '餃子', icon: '🥟', sort_order: 2 },
  { slug: 'karaage', name: 'Karaage', name_jp: '唐揚げ', icon: '🍗', sort_order: 3 },
  { slug: 'dodatki', name: 'Dodatki', icon: '🍚', sort_order: 4 },
  { slug: 'napoje', name: 'Napoje', icon: '🥤', sort_order: 5 },
]

// Alergeny używane w MESO
const ALLERGENS = {
  gluten: 'Gluten',
  soy: 'Soja',
  sesame: 'Sezam',
  egg: 'Jajka',
  shellfish: 'Skorupiaki',
  fish: 'Ryby',
  milk: 'Mleko',
  celery: 'Seler',
}
```

### 2.5 Przykładowe dane produktów (seed)

```typescript
// Przykład: Spicy Miso Ramen
const SPICY_MISO: Product = {
  id: 'ramen-spicy-miso',
  slug: 'spicy-miso',
  name: 'Spicy Miso',
  name_jp: '辛味噌ラーメン',
  description: 'Intensywny, rozgrzewający bulion miso z pikantnym mięsem mielonym i świeżym chilli.',
  ingredients: [
    'ostry bulion miso',
    'makaron ramen',
    'pikantne mięso mielone',
    'czerwona cebula',
    'edamame',
    'świeże chilli',
    'limonka',
    'olej chilli'
  ],
  story: 'Nasz legendarny "Kac-Killer". Bulion, który budzi i rozgrzewa nawet w najgorszy poniedziałek.',
  price: 36.90,
  image_url: '/images/menu/spicy-miso.jpg',
  category_id: 'ramen',
  prep_time_min: 8,
  prep_time_max: 12,
  calories: 650,
  allergens: ['gluten', 'soy', 'sesame'],
  is_vegetarian: false,
  is_vegan: false,
  is_gluten_free: false,
  is_spicy: true,
  spice_level: 2,
  is_signature: false,
  is_bestseller: true,
  is_new: false,
  is_limited: false,
  is_active: true,
  has_variants: true,      // Standardowy / Duży
  has_addons: true,        // Jajko, extra chashu, itp.
  has_spice_level: true,   // Wybór ostrości 1-3
  tags: ['spicy', 'bestseller', 'pork'],
  sort_order: 1,
}

// Przykład: Tonkotsu Chashu
const TONKOTSU_CHASHU: Product = {
  id: 'ramen-tonkotsu-chashu',
  slug: 'tonkotsu-chashu',
  name: 'Tonkotsu Chashu',
  name_jp: '豚骨チャーシュー',
  description: 'Aksamitny bulion wieprzowy gotowany 12 godzin. Klasyk japońskiej kuchni ramen.',
  ingredients: [
    'bulion tonkotsu',
    'makaron ramen',
    'wieprzowina chashu',
    'szczypiorek',
    'kukurydza',
    'prażony czosnek',
    'olej smakowy'
  ],
  story: 'Recepta przekazywana z pokolenia na pokolenie. 12 godzin slow-cook dla idealnej głębi smaku.',
  price: 38.90,
  image_url: '/images/menu/tonkotsu-chashu.jpg',
  category_id: 'ramen',
  prep_time_min: 8,
  prep_time_max: 12,
  calories: 720,
  allergens: ['gluten', 'soy', 'egg'],
  is_vegetarian: false,
  is_vegan: false,
  is_gluten_free: false,
  is_spicy: false,
  is_signature: true,
  is_bestseller: false,
  is_new: false,
  is_limited: false,
  is_active: true,
  has_variants: true,
  has_addons: true,
  has_spice_level: false,
  tags: ['signature', 'pork', 'classic'],
  sort_order: 3,
}

// Przykład: Vege Ramen
const VEGE_RAMEN: Product = {
  id: 'ramen-vege',
  slug: 'vege-ramen',
  name: 'Vege Ramen',
  name_jp: 'ベジラーメン',
  description: 'Wegański bulion z grillowanym daikonem i nori. Pełnia umami bez mięsa.',
  ingredients: [
    'wegański bulion',
    'makaron ramen',
    'grillowany daikon',
    'szczypiorek',
    'nori',
    'olej smakowy'
  ],
  price: 32.90,
  image_url: '/images/menu/vege-ramen.jpg',
  category_id: 'ramen',
  prep_time_min: 8,
  prep_time_max: 12,
  calories: 480,
  allergens: ['gluten', 'soy'],
  is_vegetarian: true,
  is_vegan: true,
  is_gluten_free: false,
  is_spicy: false,
  is_signature: false,
  is_bestseller: false,
  is_new: false,
  is_limited: false,
  is_active: true,
  has_variants: true,
  has_addons: true,
  has_spice_level: false,
  tags: ['vegan', 'vegetarian', 'healthy'],
  sort_order: 4,
}
```

---

## 3. Stack technologiczny

### 3.1 Frontend

```yaml
Framework: Next.js 14 (App Router)
Język: TypeScript (strict mode)
Styling: Tailwind CSS 3.4+
Komponenty UI: shadcn/ui (customizowane do MESO)
Ikony: Lucide React
Formularze: React Hook Form + Zod
Stan: Zustand (koszyk) + React Query (dane z API)
Animacje: Framer Motion
Mapy: Mapbox GL JS
PWA: next-pwa
```

### 3.2 Design System MESO

```css
/* tailwind.config.js - MESO Brand Colors */
colors: {
  meso: {
    // Primary - Ciepły czerwony (ramen vibes)
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',  // Primary CTA
      600: '#dc2626',  // Hover
      700: '#b91c1c',  // Active
      900: '#7f1d1d',
    },
    // Secondary - Ciemne tło (japońska elegancja)
    dark: {
      50: '#f8fafc',
      100: '#f1f5f9',
      800: '#1e293b',  // Card background
      900: '#0f172a',  // Main background
      950: '#020617',  // Deepest
    },
    // Accent - Złoty (premium feel)
    gold: {
      400: '#facc15',
      500: '#eab308',
    },
    // Neutrals
    cream: '#fef3c7',    // Light backgrounds
    charcoal: '#374151', // Text
  }
}

/* Typografia */
fontFamily: {
  sans: ['Inter', 'sans-serif'],        // Body
  display: ['Space Grotesk', 'sans-serif'], // Headlines
  japanese: ['Noto Sans JP', 'sans-serif'], // Japońskie napisy
}
```

### 3.3 Ton komunikacji

| Kontekst | Styl | Przykład |
|----------|------|----------|
| **Nagłówki** | Odważny, bezpośredni | "RAMEN, KTÓRY BUDZI" |
| **Opisy produktów** | Apetyczny, sensoryczny | "Aksamitny bulion, który otula..." |
| **CTA** | Energetyczny | "ZAMÓW TERAZ", "ROZGRZEJ SIĘ" |
| **Potwierdzenia** | Przyjazny, potoczny | "Gotujemy Twój ramen! 🍜" |
| **Błędy** | Empatyczny | "Ups, coś poszło nie tak. Sprawdzamy!" |
| **Program lojalnościowy** | Ekskluzywny | "Jesteś w MESO Club!" |

---

## 4. Moduł: Strona powitalna

### 4.1 Ekran główny (Landing)

**Ścieżka:** `/`

**Cel:** Hero page z mocnym brand statement, zachęta do zamówienia.

**Elementy UI:**
```
┌─────────────────────────────────────────┐
│                                         │
│  [Ciemne tło z subtelną teksturą]      │
│                                         │
│         ███╗   ███╗███████╗███████╗ ██████╗ │
│         ████╗ ████║██╔════╝██╔════╝██╔═══██╗│
│         ██╔████╔██║█████╗  ███████╗██║   ██║│
│         ██║╚██╔╝██║██╔══╝  ╚════██║██║   ██║│
│         ██║ ╚═╝ ██║███████╗███████║╚██████╔╝│
│         ╚═╝     ╚═╝╚══════╝╚══════╝ ╚═════╝ │
│                                         │
│         SMART ASIAN COMFORT             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│     "Ramen jak z Tokio.                 │
│      W cenie, która ma sens."           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     🍜 ZAMÓW TERAZ              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     SPRAWDŹ MENU                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📍 Gdańsk, ul. Długa 15               │
│  🕐 Dziś: 11:00 - 22:00                │
│  🚚 Dostawa: 30-45 min                 │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [Instagram] [TikTok] [Facebook]       │
│                                         │
└─────────────────────────────────────────┘
```

**Implementacja:**

```typescript
// src/app/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, Truck } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import MesoLogo from '@/components/brand/MesoLogo'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Pobierz aktualną lokalizację
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('is_default', true)
    .single()

  // Sprawdź czy otwarte
  const now = new Date()
  const currentHour = now.getHours()
  const isOpen = currentHour >= 11 && currentHour < 22

  return (
    <div className="min-h-screen bg-meso-dark-950 text-white flex flex-col">
      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <MesoLogo className="w-48 h-auto mb-4" />

        <p className="text-meso-gold-400 font-display text-lg tracking-widest mb-8">
          SMART ASIAN COMFORT
        </p>

        {/* Tagline */}
        <h1 className="text-2xl md:text-3xl text-center font-light mb-12 max-w-md leading-relaxed">
          Ramen jak z Tokio.
          <br />
          <span className="text-meso-red-500 font-semibold">
            W cenie, która ma sens.
          </span>
        </h1>

        {/* CTAs */}
        <div className="w-full max-w-sm space-y-4">
          <Button
            asChild
            className="w-full h-14 text-lg bg-meso-red-500 hover:bg-meso-red-600 text-white"
          >
            <Link href="/menu">
              🍜 ZAMÓW TERAZ
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full h-12 border-white/30 text-white hover:bg-white/10"
          >
            <Link href="/menu">
              SPRAWDŹ MENU
            </Link>
          </Button>
        </div>

        {/* Info */}
        {location && (
          <div className="mt-12 space-y-3 text-center text-white/70 text-sm">
            <p className="flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />
              {location.address}, {location.city}
            </p>
            <p className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span className={isOpen ? 'text-green-400' : 'text-meso-red-500'}>
                {isOpen ? 'Otwarte' : 'Zamknięte'}
              </span>
              {' • '} {location.open_time} - {location.close_time}
            </p>
            <p className="flex items-center justify-center gap-2">
              <Truck className="w-4 h-4" />
              Dostawa: {location.delivery_time_min}-{location.delivery_time_max} min
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <div className="flex justify-center gap-6 text-white/50">
          <a href="https://instagram.com/meso" className="hover:text-white">
            Instagram
          </a>
          <a href="https://tiktok.com/@meso" className="hover:text-white">
            TikTok
          </a>
        </div>
        <p className="text-white/30 text-xs mt-4">
          © 2026 MESO. Wszystkie prawa zastrzeżone.
        </p>
      </footer>
    </div>
  )
}
```

**Test w przeglądarce:**
1. Otwórz `http://localhost:3000`
2. ✅ Ciemne tło, logo MESO, złoty napis "SMART ASIAN COMFORT"
3. ✅ Tagline z czerwonym akcentem
4. ✅ Przycisk "ZAMÓW TERAZ" w kolorze czerwonym
5. ✅ Informacje o lokalizacji, godzinach, czasie dostawy
6. ✅ Status "Otwarte" / "Zamknięte" w zależności od godziny
7. ✅ Linki do social media

---

## 5. Moduł: Menu

### 5.1 Ekran: Lista menu

**Ścieżka:** `/menu`

**Elementy UI:**
```
┌─────────────────────────────────────────┐
│  [MESO]     📍 Gdańsk ▼         🛒 (2) │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🔥 BESTSELLER                   │   │
│  │  SPICY MISO                     │   │
│  │  "Bulion, który budzi"          │   │
│  │  -15% tylko dziś                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [🍜 Ramen][🥟 Gyoza][🍗 Karaage][🍚]  │
│  ═════════                              │
│                                         │
│  🍜 RAMEN ラーメン                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG]                           │   │
│  │ 🏆 Spicy Miso                   │   │
│  │   辛味噌ラーメン                 │   │
│  │                                 │   │
│  │   Ostry bulion miso, pikantne  │   │
│  │   mięso mielone, edamame,      │   │
│  │   chilli, limonka              │   │
│  │                                 │   │
│  │   🔥🔥 · ⏱ 8-12 min           │   │
│  │                                 │   │
│  │   BESTSELLER         36,90 zł  │   │
│  │                          [+]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG]                           │   │
│  │ ⭐ Tonkotsu Chashu              │   │
│  │   豚骨チャーシュー                │   │
│  │                                 │   │
│  │   Aksamitny bulion wieprzowy,  │   │
│  │   wieprzowina chashu, kukurydza│   │
│  │   prażony czosnek              │   │
│  │                                 │   │
│  │   ⏱ 8-12 min                   │   │
│  │                                 │   │
│  │   SIGNATURE          38,90 zł  │   │
│  │                          [+]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG]                           │   │
│  │ 🍗 Shoyu Kurczak                │   │
│  │                                 │   │
│  │   Bulion shoyu, kurczak        │   │
│  │   Teriyaki, szczypiorek, menma │   │
│  │                                 │   │
│  │   ⏱ 8-12 min         34,90 zł  │   │
│  │                          [+]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG]                           │   │
│  │ 🌱 Vege Ramen                   │   │
│  │                                 │   │
│  │   Wegański bulion, grillowany  │   │
│  │   daikon, nori                 │   │
│  │                                 │   │
│  │   🌱 VEGAN · ⏱ 8-12 min        │   │
│  │                      32,90 zł  │   │
│  │                          [+]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🥟 GYOZA 餃子                         │
│                                         │
│  ┌──────────────┐ ┌──────────────┐    │
│  │ [IMG]        │ │ [IMG]        │    │
│  │ Gyoza        │ │ Gyoza        │    │
│  │ Kurczak      │ │ Krewetka     │    │
│  │ 24,90 zł [+] │ │ 28,90 zł [+] │    │
│  └──────────────┘ └──────────────┘    │
│                                         │
│  🍗 KARAAGE 唐揚げ                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG] Karaage Rice Spicy       │   │
│  │       Ryż + kurczak + spicy mayo│   │
│  │       🔥 · ⏱ 6-10 min 32,90 zł │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ [🏠 Menu] [🛒 Koszyk] [👤 Konto]       │
└─────────────────────────────────────────┘
```

**Komponent karty produktu MESO:**

```typescript
// src/components/menu/ProductCard.tsx
'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Flame, Award, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cartStore'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

interface Props {
  product: Product
}

// Renderuj poziom ostrości jako emoji
function SpiceLevel({ level }: { level?: 1 | 2 | 3 }) {
  if (!level) return null
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Flame key={i} className="w-3 h-3 text-meso-red-500 fill-meso-red-500" />
      ))}
    </span>
  )
}

export default function ProductCard({ product }: Props) {
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Jeśli produkt ma warianty/dodatki - otwórz modal
    if (product.has_variants || product.has_addons || product.has_spice_level) {
      router.push(`/menu/${product.slug}`)
      return
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image_url,
    })
  }

  return (
    <Card
      className="bg-meso-dark-800 border-meso-dark-700 overflow-hidden cursor-pointer
                 hover:border-meso-red-500/50 transition-colors group"
      onClick={() => router.push(`/menu/${product.slug}`)}
    >
      {/* Zdjęcie */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={product.image_url || '/images/placeholder-ramen.jpg'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_bestseller && (
            <Badge className="bg-meso-gold-500 text-black">
              <Award className="w-3 h-3 mr-1" />
              BESTSELLER
            </Badge>
          )}
          {product.is_signature && (
            <Badge className="bg-meso-red-500">
              <Star className="w-3 h-3 mr-1" />
              SIGNATURE
            </Badge>
          )}
          {product.is_new && (
            <Badge className="bg-green-500">NEW</Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Nazwa */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-white text-lg">
              {product.name}
            </h3>
            {product.name_jp && (
              <p className="text-meso-gold-400 text-xs font-japanese">
                {product.name_jp}
              </p>
            )}
          </div>
        </div>

        {/* Podtytuł / opis */}
        {product.story && (
          <p className="text-white/50 text-xs mt-1 italic">
            "{product.story}"
          </p>
        )}

        <p className="text-white/70 text-sm line-clamp-2 mt-2">
          {product.description}
        </p>

        {/* Tagi */}
        <div className="flex items-center gap-3 mt-3 text-xs text-white/50">
          <SpiceLevel level={product.spice_level} />

          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {product.prep_time_min}-{product.prep_time_max} min
          </span>

          {product.is_vegetarian && (
            <span className="text-green-400">🌱 Vege</span>
          )}
        </div>

        {/* Cena i przycisk */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-meso-dark-700">
          <div>
            {product.original_price && product.original_price > product.price ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-meso-red-500">
                  {formatPrice(product.price)}
                </span>
                <span className="text-sm text-white/40 line-through">
                  {formatPrice(product.original_price)}
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-white">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <Button
            size="icon"
            className="rounded-full w-10 h-10 bg-meso-red-500 hover:bg-meso-red-600"
            onClick={handleQuickAdd}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
```

### 5.2 Ekran: Szczegóły produktu

**Ścieżka:** `/menu/[slug]`

**Specyficzne dla MESO:**
- Wybór poziomu ostrości (dla ramenów)
- Wybór rozmiaru porcji
- Historia/legenda dania
- Składniki i alergeny
- Sugerowane dodatki (cross-sell)

```typescript
// src/app/(main)/menu/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProductDetails from '@/components/menu/ProductDetails'

interface Props {
  params: { slug: string }
}

export default async function ProductPage({ params }: Props) {
  const supabase = createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      addons:product_addons(*, addon:addons(*)),
      suggested:product_suggestions(suggested:products(*))
    `)
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  return <ProductDetails product={product} />
}
```

**Implementacja szczegółów z wyborem ostrości:**

```typescript
// Fragment komponentu ProductDetails.tsx

// Wybór poziomu ostrości
{product.has_spice_level && (
  <div className="px-6 py-4 border-t border-meso-dark-700">
    <h3 className="font-semibold mb-3 text-white">
      POZIOM OSTROŚCI 🔥
    </h3>

    <div className="grid grid-cols-3 gap-3">
      {[
        { level: 1, label: 'Łagodny', emoji: '🔥' },
        { level: 2, label: 'Średni', emoji: '🔥🔥' },
        { level: 3, label: 'Piekielny', emoji: '🔥🔥🔥' },
      ].map((option) => (
        <button
          key={option.level}
          onClick={() => setSpiceLevel(option.level)}
          className={cn(
            'p-3 rounded-lg border-2 text-center transition-colors',
            spiceLevel === option.level
              ? 'border-meso-red-500 bg-meso-red-500/20'
              : 'border-meso-dark-600 hover:border-meso-red-500/50'
          )}
        >
          <p className="text-2xl mb-1">{option.emoji}</p>
          <p className="text-white text-sm">{option.label}</p>
        </button>
      ))}
    </div>

    {spiceLevel === 3 && (
      <p className="text-meso-red-500 text-xs mt-2 italic">
        ⚠️ Uwaga: Poziom "Piekielny" to nie żart. Zamów na własne ryzyko!
      </p>
    )}
  </div>
)}

// Historia dania
{product.story && (
  <div className="px-6 py-4 border-t border-meso-dark-700 bg-meso-dark-800/50">
    <p className="text-white/60 text-sm italic">
      "{product.story}"
    </p>
    <p className="text-meso-gold-400 text-xs mt-2">
      — Maciej Krawczun, Szef Kuchni MESO
    </p>
  </div>
)}

// Alergeny
{product.allergens?.length > 0 && (
  <div className="px-6 py-3 border-t border-meso-dark-700">
    <p className="text-white/40 text-xs">
      <span className="font-medium">Alergeny:</span>{' '}
      {product.allergens.join(', ')}
    </p>
  </div>
)}
```

---

## 6. Moduł: Koszyk

### 6.1 Specyfika MESO

- Sugestie "Zaokrąglij zamówienie" (np. gyoza do ramenu)
- Minimalna wartość zamówienia: 35 zł
- Info o czasie przygotowania (suma czasów)
- Cross-sell dodatków

### 6.2 Store koszyka

```typescript
// src/stores/cartStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  image?: string

  // MESO specific
  spiceLevel?: 1 | 2 | 3
  variantId?: string
  variantName?: string
  addons: {
    id: string
    name: string
    price: number
  }[]
  notes?: string
}

interface CartState {
  items: CartItem[]
  locationId: string | null
  deliveryType: 'delivery' | 'pickup'
  deliveryAddressId: string | null
  promoCode: string | null
  promoDiscount: number
  deliveryFee: number
  tip: number

  // Metody
  addItem: (item: Omit<CartItem, 'id'>) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  setLocation: (locationId: string) => void
  setDeliveryType: (type: 'delivery' | 'pickup') => void
  setDeliveryAddress: (addressId: string) => void
  setPromoCode: (code: string, discount: number) => void
  clearPromoCode: () => void
  setTip: (amount: number) => void

  // Gettery
  getSubtotal: () => number
  getTotal: () => number
  getItemCount: () => number
  getEstimatedPrepTime: () => { min: number; max: number }
  canCheckout: () => { allowed: boolean; reason?: string }
}

const MIN_ORDER_VALUE = 35 // zł

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      locationId: null,
      deliveryType: 'delivery',
      deliveryAddressId: null,
      promoCode: null,
      promoDiscount: 0,
      deliveryFee: 7.99,
      tip: 0,

      addItem: (item) => {
        const id = `${item.productId}-${item.variantId || 'base'}-${item.spiceLevel || 0}-${Date.now()}`

        // Sprawdź czy identyczny produkt istnieje
        const existingIndex = get().items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            i.spiceLevel === item.spiceLevel &&
            JSON.stringify(i.addons) === JSON.stringify(item.addons)
        )

        if (existingIndex > -1) {
          const items = [...get().items]
          items[existingIndex].quantity += item.quantity
          set({ items })
        } else {
          set({ items: [...get().items, { ...item, id }] })
        }
      },

      // ... inne metody ...

      getEstimatedPrepTime: () => {
        const items = get().items
        if (items.length === 0) return { min: 0, max: 0 }

        // Znajdź najdłuższy czas (przygotowanie równoległe)
        // + 2 min na każdą dodatkową pozycję
        let maxMin = 0
        let maxMax = 0

        // TODO: pobierz czasy z produktów
        // Na razie zwracamy estymację
        return {
          min: 10 + (items.length - 1) * 2,
          max: 20 + (items.length - 1) * 3,
        }
      },

      canCheckout: () => {
        const subtotal = get().getSubtotal()
        const items = get().items

        if (items.length === 0) {
          return { allowed: false, reason: 'Koszyk jest pusty' }
        }

        if (subtotal < MIN_ORDER_VALUE) {
          return {
            allowed: false,
            reason: `Minimalna wartość zamówienia to ${MIN_ORDER_VALUE} zł. Brakuje ${(MIN_ORDER_VALUE - subtotal).toFixed(2)} zł.`
          }
        }

        return { allowed: true }
      },
    }),
    {
      name: 'meso-cart',
      partialize: (state) => ({
        items: state.items,
        locationId: state.locationId,
        deliveryType: state.deliveryType,
        deliveryAddressId: state.deliveryAddressId,
      }),
    }
  )
)
```

### 6.3 Ekran koszyka z sugestiami

```
┌─────────────────────────────────────────┐
│  [←]              Koszyk                │
├─────────────────────────────────────────┤
│                                         │
│  TWOJE ZAMÓWIENIE                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG] Spicy Miso                │   │
│  │       🔥🔥 Średni               │   │
│  │       + Jajko marynowane        │   │
│  │                                 │   │
│  │  [-]  1  [+]          41,90 zł │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IMG] Karaage Rice Teriyaki     │   │
│  │                                 │   │
│  │  [-]  1  [+]          32,90 zł │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  🥟 ZAOKRĄGLIJ ZAMÓWIENIE?             │
│                                         │
│  ┌────────────┐ ┌────────────┐         │
│  │ [IMG]      │ │ [IMG]      │         │
│  │ Gyoza      │ │ Azjatycki  │         │
│  │ Kurczak    │ │ Colesław   │         │
│  │ 24,90 zł   │ │ 12,90 zł   │         │
│  │    [+]     │ │    [+]     │         │
│  └────────────┘ └────────────┘         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  KOD RABATOWY                           │
│  ┌───────────────────────┬────────┐   │
│  │ np. PIERWSZYRAMEN     │ UŻYJ   │   │
│  └───────────────────────┴────────┘   │
│                                         │
│  NAPIWEK 🙏                             │
│  [Bez] [5 zł] [10 zł] [15 zł]         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Produkty                   79,80 zł   │
│  Dostawa                     7,99 zł   │
│  ─────────────────────────────────────  │
│  RAZEM                      87,79 zł   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🍜 ZAMÓW · 87,79 zł            │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 7. Moduł: Zamówienia i płatności

### 7.1 Flow zamówienia MESO

```
┌─────────────────────────────────────────────────────────────┐
│                       KLIENT                                 │
│   1. Dodaje produkty do koszyka                             │
│   2. Wybiera adres dostawy                                  │
│   3. Płaci (BLIK/karta/P24)                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PUNKT MESO (Tablet)                       │
│   "Kucharz Cyfrowy" wyświetla:                              │
│   - Nowe zamówienie (dźwięk powiadomienia)                  │
│   - Lista pozycji z instrukcjami składania                  │
│   - Timer przygotowania                                     │
│   - Przycisk "GOTOWE"                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      KURIER (SMS)                            │
│   "Nowe zlecenie #1234                                      │
│    📍 ul. Długa 15 → ul. Grunwaldzka 80                     │
│    🍜 1x Spicy Miso, 1x Karaage                             │
│    💰 87,79 zł (płatne online)                              │
│    Odpowiedz TAK aby przyjąć"                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      KLIENT (App)                            │
│   - Powiadomienie push: "Kurier w drodze! 🛵"               │
│   - Śledzenie na mapie                                      │
│   - ETA: 12 min                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Statusy zamówienia

```typescript
type OrderStatus =
  | 'pending_payment'   // Oczekuje na płatność
  | 'confirmed'         // Opłacone, czeka na przygotowanie
  | 'preparing'         // W przygotowaniu (punkt MESO)
  | 'ready'             // Gotowe do odbioru/wydania
  | 'awaiting_courier'  // Czeka na kuriera
  | 'in_delivery'       // Kurier w drodze
  | 'delivered'         // Dostarczone
  | 'cancelled'         // Anulowane

// Komunikaty dla klienta
const STATUS_MESSAGES = {
  pending_payment: {
    title: 'Oczekujemy na płatność',
    subtitle: 'Dokończ płatność, aby złożyć zamówienie',
    emoji: '💳',
  },
  confirmed: {
    title: 'Zamówienie przyjęte!',
    subtitle: 'Zaraz zabieramy się do roboty',
    emoji: '✅',
  },
  preparing: {
    title: 'Gotujemy Twój ramen! 🍜',
    subtitle: 'Nasz kucharz pracuje nad Twoim zamówieniem',
    emoji: '👨‍🍳',
  },
  ready: {
    title: 'Gotowe!',
    subtitle: 'Zamówienie czeka na kuriera',
    emoji: '📦',
  },
  awaiting_courier: {
    title: 'Szukamy kuriera',
    subtitle: 'Za chwilę wyruszy w Twoją stronę',
    emoji: '🔍',
  },
  in_delivery: {
    title: 'Kurier w drodze! 🛵',
    subtitle: 'Śledź go na mapie',
    emoji: '🛵',
  },
  delivered: {
    title: 'Smacznego! 🍜',
    subtitle: 'Dziękujemy za zamówienie',
    emoji: '🎉',
  },
  cancelled: {
    title: 'Zamówienie anulowane',
    subtitle: 'Jeśli zapłaciłeś, zwrot w ciągu 3 dni',
    emoji: '❌',
  },
}
```

### 7.3 Ekran potwierdzenia zamówienia

```
┌─────────────────────────────────────────┐
│                                         │
│              🍜                         │
│                                         │
│     Gotujemy Twój ramen!                │
│                                         │
│     Zamówienie #1234                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │    [ANIMACJA STATUSU]           │   │
│  │                                 │   │
│  │  ✓ Zamówienie przyjęte          │   │
│  │  ◉ Przygotowujemy ← jesteś tu   │   │
│  │  ○ Kurier w drodze              │   │
│  │  ○ Dostarczone                  │   │
│  │                                 │   │
│  │    ⏱ Szacowany czas: 35-45 min  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  TWOJE ZAMÓWIENIE                       │
│  1x Spicy Miso (🔥🔥)         36,90 zł  │
│  + Jajko marynowane            5,00 zł  │
│  1x Karaage Rice Teriyaki     32,90 zł  │
│  Dostawa                       7,99 zł  │
│  ─────────────────────────────────────  │
│  RAZEM (opłacone)             82,79 zł  │
│                                         │
│  📍 Dostarczymy pod:                   │
│  ul. Grunwaldzka 80/5, Gdańsk          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📞 ZADZWOŃ DO MESO             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Wróć do menu]                        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 8. Moduł: Program lojalnościowy "MESO Club"

### 8.1 Zasady

| Akcja | Punkty |
|-------|--------|
| 1 zł wydane | +1 pkt |
| Rejestracja | +50 pkt (bonus powitalny) |
| Pierwsze zamówienie | +50 pkt |
| Urodziny | x2 punkty przez cały dzień |
| Polecenie znajomego | +100 pkt |

### 8.2 Nagrody

| Nagroda | Koszt |
|---------|-------|
| Gyoza (6 szt) | 150 pkt |
| Darmowa dostawa | 100 pkt |
| 10 zł rabatu | 200 pkt |
| Karaage (6 szt) | 200 pkt |
| Ramen do wyboru | 300 pkt |
| Tonkotsu z Truflą | 400 pkt |

### 8.3 Ekran MESO Club

```
┌─────────────────────────────────────────┐
│  [←]           MESO CLUB               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  [Ciemna karta z złotym logo]   │   │
│  │                                 │   │
│  │  ★ MESO CLUB ★                  │   │
│  │  JAN KOWALSKI                   │   │
│  │                                 │   │
│  │         1,250 pkt               │   │
│  │                                 │   │
│  │  Członek od: Styczeń 2026       │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🎁 Masz punkty na Gyoza!        │   │
│  │    [ODBIERZ TERAZ]              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  DOSTĘPNE NAGRODY                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🥟 Gyoza (6 szt)                │   │
│  │    150 pkt           [Odbierz] │   │
│  ├─────────────────────────────────┤   │
│  │ 🚚 Darmowa dostawa              │   │
│  │    100 pkt           [Odbierz] │   │
│  ├─────────────────────────────────┤   │
│  │ 🍜 Ramen do wyboru              │   │
│  │    300 pkt     [Brakuje 50 pkt]│   │
│  └─────────────────────────────────┘   │
│                                         │
│  JAK ZDOBYWAĆ PUNKTY?                   │
│  • 1 zł = 1 punkt                      │
│  • 🎂 x2 punkty w urodziny             │
│  • 👥 +100 pkt za polecenie            │
│                                         │
└─────────────────────────────────────────┘
```

---

## 9. Panel "Kucharz Cyfrowy" (dla operatora punktu)

### 9.1 Cel

System prowadzący operatora krok po kroku przez każdą recepturę - eliminuje potrzebę doświadczenia kulinarnego.

### 9.2 Ekran główny operatora

**Ścieżka:** `/operator/orders`

```
┌─────────────────────────────────────────┐
│  MESO · Gdańsk Długa        🔔 3 nowe  │
├─────────────────────────────────────────┤
│                                         │
│  NOWE ZAMÓWIENIA (3)                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔴 #1234 · 2 min temu           │   │
│  │                                 │   │
│  │ 1x Spicy Miso Ramen (🔥🔥)      │   │
│  │ 1x Karaage Classic              │   │
│  │                                 │   │
│  │ Dostawa · ul. Grunwaldzka 80   │   │
│  │                                 │   │
│  │ [ROZPOCZNIJ PRZYGOTOWANIE]      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟡 #1235 · 5 min temu           │   │
│  │                                 │   │
│  │ 2x Tonkotsu z Truflą            │   │
│  │ 1x Gyoza Ebi                    │   │
│  │                                 │   │
│  │ Odbiór osobisty · Jan K.       │   │
│  │                                 │   │
│  │ [ROZPOCZNIJ PRZYGOTOWANIE]      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  W PRZYGOTOWANIU (1)                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 #1233 · Timer: 3:45          │   │
│  │                                 │   │
│  │ [POKAŻ INSTRUKCJE]              │   │
│  │ [OZNACZ JAKO GOTOWE]            │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 9.3 Instrukcje przygotowania (krok po kroku)

```
┌─────────────────────────────────────────┐
│  ← Zamówienie #1234                     │
├─────────────────────────────────────────┤
│                                         │
│  SPICY MISO RAMEN 🔥🔥                  │
│  Krok 2 z 6                             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  [ZDJĘCIE/VIDEO INSTRUKCJI]     │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  DODAJ BULION MISO                      │
│                                         │
│  1. Weź pojemnik "MISO SPICY" (🔥🔥)   │
│  2. Dodaj 1 porcję (150ml) do garnka   │
│  3. Dolej 300ml wrzątku                │
│  4. Wymieszaj do rozpuszczenia         │
│                                         │
│  ⏱ Czas: około 30 sekund               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         NASTĘPNY KROK →          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         ✓ GOTOWE                │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 10. Schemat bazy danych

### 10.1 Kluczowe tabele

```sql
-- Lokalizacje (franczyzy)
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  phone VARCHAR(20),
  coordinates GEOGRAPHY(POINT, 4326),

  -- Godziny otwarcia
  open_time TIME NOT NULL DEFAULT '11:00',
  close_time TIME NOT NULL DEFAULT '22:00',

  -- Ustawienia dostawy
  delivery_radius_km DECIMAL(5,2) DEFAULT 5.0,
  delivery_fee DECIMAL(10,2) DEFAULT 7.99,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 45,
  min_order_value DECIMAL(10,2) DEFAULT 35.00,

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Klienci
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  birthday DATE,

  -- Program lojalnościowy
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES customers(id),

  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produkty
CREATE TABLE products (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  name_jp VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  story TEXT,                    -- Historia/legenda dania

  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),

  image_url TEXT,

  -- Czas przygotowania
  prep_time_min INTEGER DEFAULT 10,
  prep_time_max INTEGER DEFAULT 20,

  -- Info dietetyczne
  calories INTEGER,
  allergens TEXT[],
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_gluten_free BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 3),

  -- Statusy
  is_signature BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_limited BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Customizacja
  has_variants BOOLEAN DEFAULT false,
  has_addons BOOLEAN DEFAULT false,
  has_spice_level BOOLEAN DEFAULT false,

  tags TEXT[],
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zamówienia
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES locations(id),

  status order_status DEFAULT 'pending_payment',
  delivery_type delivery_type NOT NULL,

  -- Adres dostawy (snapshot)
  delivery_address JSONB,

  -- Czas
  scheduled_time TIMESTAMPTZ,  -- NULL = ASAP
  estimated_prep_time INTEGER, -- minuty
  estimated_delivery_time INTEGER,

  -- Płatność
  payment_method payment_method NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending',

  -- Kwoty
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  promo_code VARCHAR(50),
  promo_discount DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Punkty lojalnościowe
  loyalty_points_earned INTEGER DEFAULT 0,
  loyalty_points_used INTEGER DEFAULT 0,

  notes TEXT,

  -- Timestamps
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pozycje zamówienia
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),

  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,

  -- Customizacja MESO
  spice_level INTEGER,
  variant_id UUID REFERENCES product_variants(id),
  addons JSONB DEFAULT '[]',
  notes TEXT,

  total_price DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. Instrukcje testowania

### 11.1 Scenariusz: Pełny flow zamówienia MESO

```
1. Otwórz http://localhost:3000
   ✅ Widzisz ciemną stronę z logo MESO
   ✅ Napis "SMART ASIAN COMFORT" w złotym kolorze
   ✅ Przycisk "ZAMÓW TERAZ" w czerwonym kolorze

2. Kliknij "ZAMÓW TERAZ" → /menu
   ✅ Widzisz kategorie: Ramen, Gyoza, Karaage, Dodatki, Napoje
   ✅ Karty produktów z ciemnym tłem
   ✅ Badge "BESTSELLER" przy Spicy Miso
   ✅ Badge "SIGNATURE" przy Tonkotsu Chashu
   ✅ Badge "VEGAN" przy Vege Ramen

3. Kliknij na "Spicy Miso"
   ✅ Widzisz duże zdjęcie
   ✅ Widzisz składniki: ostry bulion miso, pikantne mięso mielone, edamame, chilli, limonka
   ✅ Widzisz wybór poziomu ostrości (🔥, 🔥🔥, 🔥🔥🔥)
   ✅ Widzisz wybór rozmiaru (Standardowy / Duży +8 zł)
   ✅ Widzisz dodatki (Jajko marynowane +5 zł, Extra chashu +12 zł)
   ✅ Widzisz cytat szefa kuchni

4. Wybierz ostrość 🔥🔥, dodaj Jajko marynowane, kliknij "DODAJ"
   ✅ Toast: "Dodano do koszyka"
   ✅ Badge na ikonie koszyka pokazuje "1"

5. Wróć do menu, przejdź do kategorii "Karaage"
   ✅ Widzisz 4 warianty: Rice Spicy, Rice Teriyaki, Fries Spicy, Fries Teriyaki

6. Dodaj "Karaage Rice Teriyaki" do koszyka

7. Przejdź do koszyka
   ✅ Widzisz 2 pozycje:
      - Spicy Miso (🔥🔥) + Jajko marynowane = 41,90 zł
      - Karaage Rice Teriyaki = 32,90 zł
   ✅ Widzisz sugestię "Zaokrąglij zamówienie" (Gyoza Kurczak, Azjatycki Colesław)
   ✅ Suma: 74,80 zł + dostawa 7,99 zł = 82,79 zł

8. Wpisz kod "PIERWSZYRAMEN" → -15% rabatu
   ✅ Nowa suma: ~70,37 zł

9. Kliknij "ZAMÓW"
   ✅ Formularz płatności
   ✅ Wybierz BLIK

10. Zapłać (sandbox)
    ✅ Przekierowanie do /orders/[id]?success=true
    ✅ Animacja "Gotujemy Twój ramen! 🍜"
    ✅ Tracker statusu

11. W panelu operatora ("Kucharz Cyfrowy") zmień status na "preparing"
    ✅ Status aktualizuje się w czasie rzeczywistym u klienta
    ✅ Operator widzi instrukcje przygotowania krok po kroku

12. Zmień na "in_delivery"
    ✅ Pojawia się przycisk "Śledź kuriera"
    ✅ Mapa z pozycją kuriera
    ✅ Klient otrzymuje SMS/push: "Kurier w drodze! 🛵"
```

### 11.2 Kody promocyjne testowe

| Kod | Rabat | Warunki |
|-----|-------|---------|
| `PIERWSZYRAMEN` | -15% | Pierwsze zamówienie |
| `MESOCLUB` | -10% | Dla członków klubu |
| `GYOZAFREE` | Darmowe Gyoza | Min. 50 zł |
| `DOSTAWAZERO` | Darmowa dostawa | Min. 40 zł |

---

## 12. Checklist MVP

### Must Have (v1.0)

- [ ] Landing page z brandingiem MESO
- [ ] Menu z kategoriami i produktami
- [ ] Wybór poziomu ostrości dla ramenów
- [ ] Koszyk z sugestiami cross-sell
- [ ] Minimalna wartość zamówienia (35 zł)
- [ ] Płatności (BLIK, karty) przez Przelewy24
- [ ] Potwierdzenie zamówienia z realtime statusem
- [ ] Panel operatora "Kucharz Cyfrowy"
- [ ] SMS do kurierów
- [ ] Program lojalnościowy MESO Club
- [ ] PWA (instalacja na telefonie)

### Nice to Have (v2.0)

- [ ] Śledzenie kuriera na mapie
- [ ] Powiadomienia push
- [ ] Zaplanowane zamówienia
- [ ] Integracja z zewnętrzną flotą (Stuart/Wolt Drive)
- [ ] Panel franczyzobiorcy (statystyki)
- [ ] A/B testing promocji
- [ ] Rekomendacje ML ("Inni zamówili też...")

---

**Koniec dokumentacji MESO v2**

*Wersja: 2.0*
*Autor: Claude AI*
*Projekt: MESO - Smart Asian Comfort*
*Data: Luty 2026*
