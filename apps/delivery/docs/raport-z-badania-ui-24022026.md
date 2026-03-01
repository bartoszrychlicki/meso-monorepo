# Raport QA UI/CSS — order.mesofood.pl vs meso-delivery.lovable.app

---

## Metodologia

Porównano zrzuty ekranu obu aplikacji ekran po ekranie. Prototyp Lovable (`meso-delivery.lovable.app`) renderuje się w szerokości ~1441px (większy breakpoint), podczas gdy produkcja (`order.mesofood.pl`) w ~1062px. Część rozbieżności wynika z tego układu siatki i różnic danych demo vs. produkcja.

**Dostępność tras w prototypie:** Prototyp nie ma wielu routów z listy — zwraca 404 dla `/menu`, `/register`, `/forgot-password`, `/reset-password`, `/regulamin`, `/polityka-prywatnosci`, `/account/*`, `/operator*`. Porównanie tych ekranów odbyło się tylko po stronie produkcji.

---

## 1. Strona główna `/` — Menu

### Prototyp vs. Produkcja

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Sekcja "Aktualne promocje" | 3 karty widoczne w siatce | 1 karta (pozostałe ucięte) | ⚠️ Bug |
| Nazwa kategorii | `RAMENY` | `RAMEN` | ⚠️ Literówka |
| MESO Club widget (sidebar) | tytuł "MESO CLUB" żółty + tekst różowy | identycznie ✓ | ✅ |
| Slider hero | Inne zdjęcia (dane demo) | Inne zdjęcia (produkcja) | — |
| Widok zalogowanego — sekcja "Ostatnio zamawiane" | widoczna i poprawna | widoczna ✅ | ✅ |
| Sidebar koszyk — "MESO CLUB" z paskiem punktów | 340 pkt + progress bar | ✅ identycznie | ✅ |
| Ikona koszyka w headerze (zalogowany) | brak licznika | Pokazuje "37 zł + licznik (1)" | ✅ produkcja lepsza |

**🐛 Bug:** W sekcji "AKTUALNE PROMOCJE" na stronie głównej (niezalogowany) widoczna jest tylko 1 karta, podczas gdy prototyp pokazuje 3. Wydaje się, że siatka się przycina lub CSS `overflow: hidden` bez właściwego `grid-template-columns`.

**🐛 Bug:** Literówka: sekcja kategorii nazywa się `RAMEN` w produkcji zamiast `RAMENY` (jak w prototypie — jest to forma odpowiednia do produktów w niej zawartych).

---

## 2. Nawigacja (globalny header)

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Logo MESO | różowy neon, font Display | identyczny ✅ | ✅ |
| Nawigacja środkowa | Menu / Szukaj / Zamówienia / Punkty / Profil | identyczna ✅ | ✅ |
| Aktywny link — background | zaokrąglone pill różowe | identycznie ✅ | ✅ |
| Przycisk Koszyk | outlined border, rounded, ikona + tekst | identycznie ✅ | ✅ |
| Separator pod headerem | bardzo cienka linia `border-bottom` | widoczna ✅ | ✅ |
| Kolor tła | `#120a1e` ciemny fiolet | identycznie ✅ | ✅ |

---

## 3. Ekran `/search` — Szukaj

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Pole wyszukiwania | Narrower, border visible, brak ikony lupy wewnątrz | Szersze, wypełnia całą stronę full-width, **ikona lupy** wewnątrz po lewej | ⚠️ Różnica |
| Placeholder "Czego szukasz?" | ✅ | ✅ | ✅ |
| Podpis pomocniczy | "Wpisz nazwę dania, składnik lub kategorię..." **pod** polem | "Wpisz nazwę dania…" **pod** polem | ✅ |
| Layout pola wyszukiwania | Pole ma `max-width` ok. 640px, wycentrowane | Pole zajmuje pełną szerokość strony (brak sidebar) | ⚠️ |
| Stan pusty | Tylko tekst pomocniczy | Ikona lupy + tekst "Wpisz nazwe dania, aby wyszukac" | ⚠️ Brak ikony w prototypie |
| **Footer** | Brak stopki | **Pełna stopka** z metodami płatności, social media, dane firmy | ⚠️ Dodatkowy element |

**Sugestia:** Pole wyszukiwania w produkcji powinno być bardziej wycentrowane i ograniczone szerokością (max-width ~640px) jak w prototypie. W produkcji zajmuje pełną szerokość bez sidebaru, co wygląda niespójnie.

**🐛 Bug:** Ikona stanu pustego w produkcji (stan bez wyników) ma literówkę: **"Wpisz nazwe dania"** — brak polskiego ogonka "ę".

---

## 4. Ekran `/login` — Zaloguj się

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Tło | Ciemny fiolet `#0f0a1e`, brak elementów | Ciemny `#0a0614`, brak elementów | ✅ zbliżone |
| Logo MESO | Czerwonawo-różowy kolor, przyciemniony efekt neon | Jasno różowy neon, wyraźniejszy | ⚠️ Różnica koloru |
| Tytuł "ZALOGUJ SIĘ" | Szaro-czerwonawy, przyciemniony | Biały, wyraźny | ⚠️ Różnica |
| Pola input (Email/Hasło) | Border widoczny, ciemne tło | Border widoczny, ciemne tło | ✅ |
| Przycisk "ZALOGUJ" | **Ciemnożółty/złoty** kolor (`#b8920a`) | **Jaskrawożółty** (`#ffff00` lub podobny) | ⚠️ **Kluczowa różnica kolorystyczna** |
| "Zapomniałeś hasła?" | Brak w prototypie! | Widoczny link różowy pod polem hasła | ⚠️ Brak w prototypie |
| Przycisk "Kontynuuj z Google" | Outlined, border widoczny | Outlined, ciemne tło | ✅ zbliżone |
| Link "Zarejestruj się" | Różowy | Różowy ✅ | ✅ |
| Link "Pomiń i przeglądaj menu" | Widoczny | Widoczny ✅ | ✅ |
| Strzałka "Powrót do menu" | Brak w prototypie | **Widoczna w lewym górnym rogu** | ⚠️ |
| Stopka "© 2026 MESO" | Widoczna | Widoczna ✅ | ✅ |
| Ogólny look | Przyciemnione — jakby overlay/opacity na elementach | Ostre, kontrastowe | ⚠️ **Problem z kontrastem** |

**🔴 Krytyczna różnica:** Przycisk "ZALOGUJ" w prototypie ma kolor **ciemnożółty/złoty**, natomiast w produkcji jest **jaskrawożółty**. Należy ujednolicić kolor CTA buttona.

**🔴 Problem:** Cała strona logowania w prototypie wygląda na przyciemnioną/nakrytą overlay — ikony, tytuły i pola są słabo widoczne (niski kontrast). W produkcji jest poprawna widoczność. To może sugerować że prototyp był renderowany bez jakiegoś loaded state lub CSS nie załadował się poprawnie podczas mojego testowania.

---

## 5. Ekran `/register` — Rejestracja

Prototyp zwraca 404 dla `/register`. **Trasa nieistniejąca w prototypie** — produkcja ma pełny formularz rejestracji z polami: Imię, Email, Hasło, Powtórz hasło, checkbox marketingowy, przyciski Zarejestruj / Google, link Zaloguj się.

**Sugestia:** Dodać tę trasę do prototypu Lovable lub zignorować (trasa zaimplementowana w produkcji poprawnie).

---

## 6. Ekran `/forgot-password` — Zapomniałeś hasła?

Prototyp zwraca 404. Produkcja ma ekran z ikoną koperty, tytułem, polem email i przyciskiem "Wyślij link resetujący". Wygląda poprawnie.

---

## 7. Ekran `/cart` — Koszyk

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Stan pusty — ikona | Ikona koszyka, szara | Identyczna ✅ | ✅ |
| Tytuł "Koszyk jest pusty" | Bold, białe | ✅ | ✅ |
| Podtytuł | "Dodaj coś pysznego z menu!" | ✅ | ✅ |
| Przycisk "PRZEGLĄDAJ MENU" | **Różowy/Magenta** zaokrąglony | **Różowy/Magenta** zaokrąglony ✅ | ✅ |
| Stopka | Brak | **Pełna stopka** z metodami płatności | ⚠️ Dodatkowy element |
| Brak nawigacji top | Prototyp chowa header na /cart | Produkcja też chowa header | ✅ |

---

## 8. Ekran `/orders` — Zamówienia (zalogowany)

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Widok listy | 4 zamówienia z numerem, datą, statusem, ceną, strzałką | 4 zamówienia – układ identyczny ✅ | ✅ |
| Breadcrumb "Wróć" | Brak | **Strzałka ← Wróć** w lewym górnym rogu | ⚠️ |
| Tytuł | `TWOJE ZAMÓWIENIA` (z ikonką) | `MOJE ZAMÓWIENIA` (tekst) | ⚠️ Różnica nazwy |
| Badge statusu "Smacznego!" | Zielony ✅ | Zielony ✅ | ✅ |
| Badge "Oczekujemy na płatność" | Żółty z ikoną | Żółty z ikoną ✅ | ✅ |
| Cena (prawa strona) | Różowa, bold | Różowa, bold ✅ | ✅ |
| Separator między zamówieniami | Brak separatora | Brak separatora ✅ | ✅ |

**Sugestia:** Tytuł strony to `MOJE ZAMÓWIENIA` w produkcji vs. `TWOJE ZAMÓWIENIA` (widok niezalogowanego w prototypie — to inna wersja). Upewnij się, że zalogowany widok w prototypie też mówi "MOJE ZAMÓWIENIA".

---

## 9. Ekran `/orders/{id}` — Szczegóły zamówienia

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Nagłówek | "Zamówienie #XX" + data | "Zamówienie #58 / 12 lutego 2026 20:54" ✅ | ✅ |
| Status banner | Widoczny kolorowy | Widoczny (żółty "Oczekujemy na płatność") ✅ | ✅ |
| Sekcja "Status zamówienia" | Brak w prototypie (inne ID) | Widoczna z ikoną | — |

---

## 10. Ekran `/loyalty` — Punkty

| Element | Prototyp (niezalog.) | Produkcja (zalogowany) | Ocena |
|---|---|---|---|
| Widok niezalogowanego | Ikona trofeum neon, tytuł "MESO POINTS", przycisk "ZALOGUJ SIĘ" (żółty) | Przekierowuje do panelu punktów (zalogowany) | ✅ |
| Ikona trofeum | Neon, różowo-pomarańczowy gradient | W produkcji zalogowanej — ikona trofeum w headerze karty | ✅ |
| Widok zalogowanego — karta "MESO Club" | Gradient różowo-fioletowy, punkty, progress bar | Gradient różowo-ciemnoczerwony, punkty, progress bar | ⚠️ Gradient inny |
| Tabs "Nagrody / Historia" | Widoczne w produkcji | — | — |
| Nagroda "Darmowa dostawa" | Widoczna z przyciskiem "Odbierz" | Widoczna ✅ | ✅ |
| Brak breadcrumb | — | "← Profil" breadcrumb | ⚠️ |

**Różnica koloru karty:** Gradient karty MESO Club w produkcji jest bardziej czerwono-brązowy, podczas gdy powinien być różowo-fioletowy (magenta gradient jak w prototypie sidebar widget).

---

## 11. Ekran `/account` — Profil (zalogowany)

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Avatar | Brak (prototyp ma 404) | Różowy kółko z inicjałem "B" | — |
| Wyświetlana nazwa | — | "bartosz.rychlicki" (username zamiast imię i nazwisko) | ⚠️ Bug |
| Email pod nazwą | — | Widoczny ✅ | — |
| Karta "MESO Club" | — | Gradient karta z gwiazdką i strzałką | — |
| Lista opcji | — | Dane osobowe / Adresy / Platnosci / Ulubione / Moje zamowienia / Ustawienia | ⚠️ Literówki |
| Przycisk "Wyloguj się" | — | Widoczny na dole | — |

**🐛 Bug:** Na ekranie profilu wyświetla się `bartosz.rychlicki` (username/login) zamiast pełnego imienia i nazwiska użytkownika.

**🐛 Bug/literówki w menu profilu:** `Platnosci` zamiast `Płatności`, `Moje zamowienia` zamiast `Moje zamówienia` — brakujące polskie znaki diakrytyczne.

---

## 12. Ekran `/account/personal` — Dane osobowe

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Nagłówek | "Dane osobowe" | "Dane osobowe" ✅ | ✅ |
| Pola: Imię, Nazwisko, Email, Telefon, Data urodzenia | Widoczne ✅ | Widoczne ✅ | ✅ |
| Placeholder Imię | "Jan" | "Jan" ✅ | ✅ |
| Przycisk Zapisz | Złoty/ciemny background | **Złoty/ciemny background** ✅ | ✅ |
| Styl pól | Zaokrąglone, ciemne tło | Zaokrąglone, ciemne tło ✅ | ✅ |

Ekran wygląda poprawnie.

---

## 13. Ekran `/account/addresses` — Adresy

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Prototyp | 404 | Pełny ekran ✅ | — |
| Karta adresu | — | "Dom · Domyślny" z adresem, przyciskami Edytuj/Usuń | — |
| Przycisk "+ Dodaj" | — | Górny prawy, różowy pill ✅ | — |
| Badge "Domyślny" | — | Różowy badge ✅ | — |

---

## 14. Ekran `/account/club` — MESO Club

| Element | Wartość |
|---|---|
| Karta klubu | Pomarańczowy gradient (inny niż w prototypie gdzie jest różowo-fioletowy) |
| Punkty "450" | Widoczne, duże ✅ |
| Poziom "Brązowy" | Badge szary ✅ |
| Info "50 pkt do Srebrny" | ✅ |
| Przyciski "Poleć znajomemu" + "Urodziny" | Widoczne w kafelkach ✅ |
| Nagrody | Widoczne ✅ |

**⚠️ Kolor karty:** Karta MESO Club ma pomarańczowy gradient w `/account/club` — powinien być spójny z całą aplikacją (magenta/fioletowy jak w sidebar).

---

## 15. Ekran `/account/settings` — Ustawienia konta

| Element | Wartość |
|---|---|
| Sekcja "Dane profilu" | Pola: Imię i nazwisko, Email (locked), Telefon, Data urodzin ✅ |
| Przycisk "Zapisz zmiany" | Różowo-magenta ✅ |
| Sekcja "Powiadomienia" | "Push notifications" z togglem ✅ |
| Ikona powiadomień | Dzwonek różowy ✅ |

---

## 16. Ekran `/account/favorites` — Ulubione

**🐛 Bug/stub:** Ekran pokazuje komunikat "Ulubione produkty / Wkrotce dostepne" — brakuje polskich znaków: **"Wkrótce dostępne"** zamiast "Wkrotce dostepne".

---

## 17. Ekran `/checkout` — Zamówienie

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Tytuł "CHECKOUT" | Brak (prototyp pusty dla niezalogowanego) | Bold, white ✅ | — |
| Sposób dostawy — "Dostawa wkrótce" | — | Szara disabled karta ✅ | — |
| "Odbiór osobisty" | — | Aktywna karta z border różowym ✅ | — |
| Czas realizacji | — | "Jak najszybciej · Szacowany czas: 30-45 min" ✅ | — |
| Dane kontaktowe — placeholder | — | Jan / Kowalski / jan@example.com | ⚠️ Dane nie są pre-fill z profilu |
| Płatności | — | BLIK / Karta / Google Pay / Gotówka ✅ | ✅ |
| "Bezpieczne płatności przez Przelewy24" | — | Link w niebieskim bannerze ✅ | ✅ |
| Napiwek | — | Przyciski: Bez napiwku / 5 zł / 10 zł / 15 zł / Inna kwota ✅ | ✅ |
| Podsumowanie | — | Produkty / Dostawa / Razem — z żółtą kwotą razem ✅ | ✅ |

**🐛 Bug:** Dane kontaktowe w checkout nie są pre-wypełnione danymi zalogowanego użytkownika (widoczne są placeholdery "Jan", "Kowalski", "jan@example.com" zamiast rzeczywistych danych profilu).

---

## 18. Ekran `/product/{id}` — Szczegół produktu

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Zdjęcie produktu | Placeholder — brak zdjęcia (tylko emoji 🍜 na ciemnym tle) | **Pełne zdjęcie produktu** ✅ | ✅ produkcja lepsza |
| Tytuł produktu | Font Display, biały | Font Display, biały ✅ | ✅ |
| Nazwa japońska pod tytułem | Brak w prototypie | **Widoczna "辛味噌ラーメン"** ✅ | ✅ produkcja lepsza |
| Opis | Widoczny | Widoczny ✅ | ✅ |
| Cena ze skreśloną oryginalną | "38 zł" | "37 zł ~~43 zł~~" ✅ | ✅ |
| Kalorie | Brak | **"650 kcal"** ✅ | ✅ produkcja lepsza |
| Alergeny (tagi) | Brak | **Gluten / Soja / Sezam** jako pill badges ✅ | ✅ produkcja lepsza |
| Cytat szefa kuchni | Brak | **Widoczny** ✅ | ✅ produkcja lepsza |
| Konfiguratory | Poziom ostrości / Extra toppingi (pionowa lista) | Poziom ostrości / Rozmiar (siatka przycisków) | ⚠️ Różna struktura |
| Selektor ilości + przycisk DODAJ | Sticky bottom bar | Sticky bottom bar ✅ | ✅ |
| Przycisk DODAJ | Różowo-magenta | **Złoty/ciemny** | ⚠️ **Różny kolor!** |
| Breadcrumb "Wróć" | "← Wróć" | "← Wroc" (brak ogonka!) | 🐛 |

**🔴 Kluczowa różnica:** Przycisk "DODAJ · 37 zł" na ekranie produktu ma kolor **złoty/ciemny** w produkcji, natomiast w prototypie jest **różowo-magenta**. Jeden z tych kolorów powinien być standardem CTA.

**🐛 Bug:** Breadcrumb "Wroc" zamiast "Wróć" — brak polskiego znaku.

---

## 19. Ekran `/locations` — Lokalizacje

| Element | Prototyp | Produkcja | Ocena |
|---|---|---|---|
| Tytuł | "LOKALIZACJE" (uppercase, duży) | "Nasze lokalizacje" (mieszany case, mniejszy) | ⚠️ |
| Podtytuł | Brak | "Znajdz najblizszy punkt MESO" | 🐛 |
| Mapa placeholder | "Mapa lokalizacji MESO" (różowa ikona pina) | "Mapa wkrotce" (szara ikona) | ⚠️ |
| Karta lokalizacji | "MESO Kazimierz, Józefa 15, Kraków" | "MESO Mokotow, ul. Połwawska 24, Warszawa" | różne dane |
| Badge statusu | "Teraz Kcto: • Otwarte" | Badge widoczny | ⚠️ |
| Breadcrumb | Brak | "← Menu" | ⚠️ |

**🐛 Bug:** "Znajdz najblizszy punkt MESO" — brakujące polskie znaki (powinno być "Znajdź najbliższy punkt MESO").

**🐛 Bug:** Mapa zastępcza ma tekst "Mapa wkrotce" — brak znaków diakrytycznych (powinno być "Wkrótce").

---

## 20. Ekran `/regulamin` — Regulamin

Ekran istnieje tylko w produkcji (prototyp 404). Układ wygląda poprawnie: nagłówek "REGULAMIN" wyśrodkowany, ikona dokumentu, treść formatowana. ✅

---

## 21. Panel operatora `/operator`

Prototyp zwraca 404 dla panelu operatora. Produkcja ma pełny Kanban board:

| Element | Wartość |
|---|---|
| Header | "MESO Kitchen · Kucharz Cyfrowy" + zegar + wyloguj |
| Nawigacja | Zamówienia / Statystyki / Ustawienia |
| Kolumny | NOWE / PRZYGOTOWANIE / GOTOWE / W DOSTAWIE / ZAKOŃCZONE |
| Karty zamówień | Numer, typ (Dostawa/Odbiór), czas, produkty, przycisk akcji |
| Kolory status | Pomarańczowy (Nowe), Niebieski (Przygotowanie), Zielony (Gotowe), Fioletowy (W Dostawie) |

Panel operatora jest ekranem tylko produkcyjnym — brak odniesienia w prototypie.

---

## Podsumowanie bugs i różnic — priorytetyzacja

### 🔴 Krytyczne (CTA/spójność kolorystyczna)

1. **Przycisk CTA na detail produktu** — złoty w produkcji, magenta w prototypie. Należy ujednolicić — jeden kolor CTA w całej aplikacji.
2. **Przycisk "ZALOGUJ" na /login** — jaskrawożółty w produkcji vs ciemnożółty/złoty w prototypie.
3. **Sekcja "Aktualne Promocje"** — tylko 1 karta widoczna zamiast 3 (potencjalny bug layout/grid).

### 🟠 Ważne (literówki, brakujące znaki diakrytyczne)

4. `RAMEN` → powinno być `RAMENY`
5. `Wpisz nazwe dania` → `Wpisz nazwę dania` (search empty state)
6. `Wkrotce dostepne` → `Wkrótce dostępne` (favorites)
7. `Platnosci` → `Płatności` (menu profilu)
8. `Moje zamowienia` → `Moje zamówienia` (menu profilu)
9. `Znajdz najblizszy` → `Znajdź najbliższy` (locations subtitle)
10. `Mapa wkrotce` → `Mapa wkrótce` (locations)
11. `Wroc` → `Wróć` (breadcrumb na detail produktu)

### 🟡 Istotne UI (spójność wizualna)

12. **Gradient karty MESO Club** — pomarańczowy w `/account/club` vs różowo-fioletowy w sidebar widget i widoku zalogowanego home. Należy ujednolicić.
13. **Dane kontaktowe w checkout** nie są pre-fill z profilu zalogowanego użytkownika.
14. **Nazwa użytkownika** na /account pokazuje `bartosz.rychlicki` (username) zamiast pełnego imienia "Bartosz Rychlicki".
15. **Pole wyszukiwania** na /search zajmuje pełną szerokość bez max-width — w prototypie jest węższe i wyśrodkowane.
16. **Tytuł "LOKALIZACJE"** — w prototypie uppercase + duże, w produkcji "Nasze lokalizacje" małe.
17. **Stopka** widoczna na ekranach /search, /cart — w prototypie jej nie ma. Weryfikować czy to oczekiwane zachowanie.
18. **Breadcrumb "← Wróć"** pojawia się w produkcji na wielu ekranach, w prototypie go nie ma — dodatkowa nawigacja pomocnicza, ale warto ujednolicić styl.

### 🟢 Drobne / do decyzji

19. Ekrany `/register`, `/forgot-password`, `/reset-password`, `/regulamin`, `/polityka-prywatnosci`, `/account/*` nie istnieją w prototypie — były prawdopodobnie dodane post-prototype.
20. Panel operatora `/operator` — brak w prototypie, ale produkcja ma pełną implementację kanban board.
21. Produkcja ma więcej detali na ekranie produktu (kalorie, alergeny, cytat szefa) — to pozytywne rozszerzenia względem prototypu.

---

## Rekomendacje poprawek (skrót)

```
CSS/Styl:
- Ustalić jeden kolor CTA: magenta (#E91E8C) lub żółty (#F5C400) — konsekwentnie stosować
- Gradient karty MESO Club: ujednolicić do jednego motywu (magenta-fioletowy)
- Pole wyszukiwania /search: dodać max-width: 640px + margin: auto

Tłumaczenia/kopie:
- Masowe wyszukiwanie/replace brakujących polskich znaków
- RAMEN → RAMENY
- Imię zamiast username w headerze profilu

Dane:
- Pre-fill checkout z danymi profilu użytkownika
- Naprawić grid promocji na homepage (min 3 karty visible)

Routing (jeśli potrzebny sync z prototypem):
- Dodać /register, /forgot-password do Lovable lub zaakceptować jako produkcyjne rozszerzenia
```