# MESO Club — Program lojalnosciowy — Design Document

Data: 2026-02-25
Wersja: 1.0
Status: Zatwierdzony

---

## Podsumowanie

Program lojalnosciowy oparty o system kuponow. Klienci zbieraja punkty za zamowienia, wymieniaja je na kupony (jednorazowe kody rabatowe), ktore automatycznie trafiaja do koszyka. System wykorzystuje istniejaca logike rabatowa — kupon zajmuje ten sam slot co kod promocyjny.

## Kluczowe zasady

- 1 PLN wydane = 1 punkt
- Punkty wymieniane na kupony (darmowa dostawa, rabat, darmowy produkt)
- Max 1 aktywny kupon na raz
- Kupon wazny 24h od aktywacji, punkty nie podlegaja zwrotowi
- Kupon LUB kod promo — jeden slot w koszyku
- Tiery (bronze/silver/gold) otwieraja dostepp do lepszych nagrod
- Tier nigdy nie spada (lifetime points)

---

## 1. Model danych

### Nowa tabela: `loyalty_coupons`

| Pole | Typ | Opis |
|------|-----|------|
| `id` | UUID | PK |
| `customer_id` | UUID | FK -> customers |
| `reward_id` | UUID | FK -> loyalty_rewards, nullable (null dla kuponow powitalnych) |
| `code` | VARCHAR UNIQUE | Np. `MESO-A7X3K` |
| `coupon_type` | ENUM | `free_delivery` / `discount` / `free_product` |
| `discount_value` | NUMERIC | Kwota lub procent (nullable) |
| `free_product_name` | VARCHAR | Np. "Gyoza (6 szt)" (nullable) |
| `status` | ENUM | `active` / `used` / `expired` |
| `points_spent` | INTEGER | 0 dla kuponow powitalnych |
| `source` | ENUM | `reward` / `referral_welcome` |
| `activated_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | activated_at + 24h (7 dni dla powitalnych) |
| `used_at` | TIMESTAMPTZ | nullable |
| `order_id` | UUID | FK -> orders, nullable, wypelniane po uzyciu |

### Zmiany w `customers`

| Pole | Typ | Opis |
|------|-----|------|
| `lifetime_points` | INTEGER default 0 | Nigdy nie maleje, do obliczania tieru |
| `referral_code` | VARCHAR UNIQUE | Generowany przy rejestracji (np. `MESO-JAN42`) |
| `referred_by` | UUID FK -> customers | Nullable, ustawiane raz, niezmienne |

### Zmiany w `loyalty_rewards`

| Pole | Typ | Opis |
|------|-----|------|
| `min_tier` | VARCHAR default 'bronze' | Minimalny tier do aktywacji |

---

## 2. Zbieranie punktow

```
Zamowienie delivered ->
  earned = floor(order_total)
  loyalty_points += earned
  lifetime_points += earned

  if first_order:
    +50 bonus (loyalty_points + lifetime_points)
    log: "Bonus za pierwsze zamowienie"

  if has_referrer AND first_order:
    referrer.loyalty_points += 100
    referrer.lifetime_points += 100
    log na referrerze: "Polecenie: +100 pkt"

  check tier upgrade (lifetime_points vs thresholds)
  log to loyalty_history
```

---

## 3. Tiery

| Tier | Prog (lifetime_points) | Efekt |
|------|----------------------|-------|
| Bronze | 0 | Domyslny |
| Silver | 500 | Dostep do nagrod z `min_tier: silver` |
| Gold | 1500 | Dostep do nagrod z `min_tier: gold` |

Progi konfigurowalne w `app_config`. Tier nigdy nie spada.

---

## 4. Kupony — aktywacja

```
Klient klika "Aktywuj" ->
  sprawdz: brak aktywnego kuponu
  sprawdz: loyalty_points >= reward.points_cost
  sprawdz: loyalty_tier >= reward.min_tier

  modal: "Punkty nie podlegaja zwrotowi. Kupon wazny 24h."

  -> loyalty_points -= points_cost
  -> INSERT loyalty_coupons (status: active, expires: +24h, source: reward)
  -> log loyalty_history (type: spent)
  -> kupon trafia do koszyka (Zustand)
```

Ograniczenia: 1 aktywny kupon na raz. Kupon albo kod promo — jeden slot.

Wygasanie: lazy check (przy odczycie) — status -> expired gdy expires_at < now(). Punkty nie wracaja.

---

## 5. Kupony — uzycie w zamowieniu

```
Checkout ->
  jesli kupon w koszyku:
    walidacja: status = active, expires_at > now(), customer_id = current user
    aplikuj rabat (free_delivery / discount / free_product)
    -> coupon.status = 'used', used_at = now(), order_id = X
```

Sync Zustand <-> DB: przy ladowaniu koszyka zawsze GET /api/loyalty/active-coupon. Jesli kupon wygasl lub nie istnieje, czyscimy Zustand.

---

## 6. Referral

### Rejestracja

```
Nowy klient podaje numer telefonu polecajacego (opcjonalne) ->
  numer istnieje w customers
  nie jest wlasny numer
  polecajacy ma >= 1 delivered zamowienie
  polecajacy ma < 10 polecen w biezacym miesiacu
    (COUNT z customers WHERE referred_by = X AND created_at > start of month)

  -> customer.referred_by = polecajacy.id
  -> INSERT loyalty_coupons:
      source: referral_welcome
      coupon_type: free_product
      free_product_name: "Gyoza (6 szt)"
      points_spent: 0
      status: active
      expires_at: +7 dni
```

### Po pierwszym delivered zamowieniu polecanego

```
  -> polecajacy: +100 pkt (loyalty_points + lifetime_points)
  -> log loyalty_history na polecajacym
```

---

## 7. API endpoints

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/loyalty/activate-coupon` | POST | Wymiana punktow na kupon |
| `/api/loyalty/active-coupon` | GET | Aktywny kupon klienta (do syncu z koszykiem) |
| `/api/loyalty/history` | GET | Historia punktow z paginacja |

Walidacja kuponu w checkout: rozszerzenie istniejacego flow o sprawdzanie loyalty_coupons.

---

## 8. Zmiany UI

### Klient

| Ekran | Zmiana |
|-------|--------|
| MESO Club (`/account/club`) | Realna aktywacja kuponow. Modal potwierdzenia. Blokada przy aktywnym kuponie. Nagrody wyszarzone przy niskim tierze. |
| Koszyk | 1 slot: kupon lub kod promo. Podpowiedz "Masz X pkt — aktywuj kupon!". |
| Checkout | Rabat z kuponu w podsumowaniu. |
| Profil | Wyswietlanie referral code (numer telefonu). |
| Rejestracja | Pole "Numer telefonu polecajacego". Info o kuponie powitalnym. |
| Loyalty (`/loyalty`) | Historia punktow (earned/spent/bonus) zamiast "coming soon". |
| Order confirmation | Wyswietlanie zdobytych punktow + info o bonusie za 1. zamowienie. |

### Operator

| Ekran | Zmiana |
|-------|--------|
| Loyalty settings | Pole `min_tier` przy nagrodach (dropdown: bronze/silver/gold). |

---

## 9. Swiadome pominiecia

| Element | Powod |
|---------|-------|
| Birthday 2x bonus | Zbyt duza zlozonosc vs wartosc |
| Mnoznik punktow per tier | Tiery gatuja nagrody, nie mnoza |
| Wiele kuponow na raz | 1 slot = prostota |
| Stackowanie kupon + promo kod | Jeden slot — jedno zrodlo rabatu |
| Operator zarzadzajacy kuponami | Kupony generowane automatycznie |

---

## 10. Zabezpieczenia anty-abuse (referral)

| Ryzyko | Zabezpieczenie |
|--------|----------------|
| Fake konta | Punkty dla polecajacego dopiero po delivered zamowieniu (min. 35 PLN) |
| Kolko wzajemne | Klient moze byc polecony tylko raz (immutable referred_by) |
| Masowe polecenia | Max 10 polecen na miesiac (query-based, bez crona) |
| Wlasny numer | Walidacja: numer != wlasny |
| Numer nie istnieje | Polecajacy musi miec min. 1 delivered zamowienie |
