# MESO Delivery PWA - Scenariusz Testów Manualnych

> **Wersja:** 1.0
> **Data:** Luty 2026
> **Zakres:** Faza 4 (Menu i Produkty) + Faza 5 (Koszyk)

---

## Wymagania wstępne

### Środowisko testowe
- **URL:** http://localhost:3000 (lub podany adres staging)
- **Przeglądarki do testów:**
  - Chrome (desktop + mobile emulation)
  - Safari (iOS)
  - Firefox (desktop)
- **Rozdzielczości do testów:**
  - Mobile: 375x667 (iPhone SE)
  - Mobile: 430x932 (iPhone 14 Pro Max)
  - Tablet: 768x1024 (iPad)
  - Desktop: 1920x1080

### Przed rozpoczęciem testów
1. Wyczyść cache przeglądarki i localStorage
2. Otwórz DevTools (F12) → zakładka Console
3. Sprawdź czy nie ma błędów JavaScript na starcie

---

## CZĘŚĆ 1: Strona Menu (/menu)

### Test 1.1: Ładowanie strony menu

**Kroki:**
1. Otwórz http://localhost:3000/menu
2. Poczekaj na pełne załadowanie strony

**Oczekiwany rezultat:**
- [ ] Strona ładuje się bez błędów w konsoli
- [ ] Widoczny header "MENU" z ikoną koszyka
- [ ] Widoczne pole wyszukiwania "Znajdź swoje ulubione danie..."
- [ ] Widoczna lista kategorii w sidebarze (Wszystko, Ramen, Gyoza, Rice Bowls, Dodatki, Napoje)
- [ ] Kategorie mają ikony emoji i japońskie nazwy (np. Ramen ラーメン)
- [ ] Widoczne karty produktów z obrazkami

**Raport:**
```
Test 1.1 - Ładowanie menu
Status: [PASS/FAIL]
Czas ładowania: _____ ms
Błędy w konsoli: [TAK/NIE] - jeśli TAK, wklej błędy
Screenshot: [załącz jeśli FAIL]
Uwagi: _____________________
```

---

### Test 1.2: Nawigacja po kategoriach

**Kroki:**
1. Kliknij na kategorię "Ramen" w sidebarze
2. Kliknij na kategorię "Gyoza"
3. Kliknij na kategorię "Napoje"
4. Kliknij na "Wszystko"

**Oczekiwany rezultat:**
- [ ] Kliknięcie kategorii podświetla ją (różowy kolor)
- [ ] Strona scrolluje do odpowiedniej sekcji
- [ ] Produkty filtrują się według kategorii
- [ ] "Wszystko" pokazuje wszystkie produkty

**Raport:**
```
Test 1.2 - Nawigacja kategorii
Status: [PASS/FAIL]
Działające kategorie: [lista]
Niedziałające kategorie: [lista]
Screenshot: [załącz jeśli FAIL]
Uwagi: _____________________
```

---

### Test 1.3: Karta produktu

**Kroki:**
1. Znajdź kartę produktu "Spicy Miso"
2. Sprawdź widoczne elementy

**Oczekiwany rezultat:**
- [ ] Widoczny obrazek produktu
- [ ] Nazwa produktu: "Spicy Miso"
- [ ] Opis produktu (skrócony)
- [ ] Cena w kolorze różowym: "36,90 zł"
- [ ] Przycisk "+ DODAJ" z różową obwódką
- [ ] Badge "Bestseller" lub "Signature" (jeśli dotyczy)

**Raport:**
```
Test 1.3 - Karta produktu
Status: [PASS/FAIL]
Brakujące elementy: [lista]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 1.4: Quick Add - produkt z opcjami

**Kroki:**
1. Kliknij przycisk "+ DODAJ" na produkcie "Spicy Miso"

**Oczekiwany rezultat:**
- [ ] Przekierowanie do strony szczegółów produktu (/menu/spicy-miso)
- [ ] NIE dodaje bezpośrednio do koszyka (bo produkt ma opcje)

**Raport:**
```
Test 1.4 - Quick Add z opcjami
Status: [PASS/FAIL]
Przekierowanie: [TAK/NIE]
URL docelowy: _____________________
Uwagi: _____________________
```

---

## CZĘŚĆ 2: Strona szczegółów produktu (/menu/[slug])

### Test 2.1: Wyświetlanie szczegółów produktu

**Kroki:**
1. Otwórz http://localhost:3000/menu/spicy-miso
2. Sprawdź wszystkie elementy strony

**Oczekiwany rezultat:**
- [ ] Duży obrazek produktu na górze
- [ ] Strzałka powrotu (←) w lewym górnym rogu
- [ ] Nazwa produktu: "Spicy Miso"
- [ ] **Cena aktualna:** "36,90 zł" (różowy kolor, pogrubiona)
- [ ] **Cena oryginalna:** "42,90 zł" (szary, przekreślona) - NOWA FUNKCJA
- [ ] **Kalorie:** "650 kcal" - NOWA FUNKCJA
- [ ] Opis produktu
- [ ] **Cytat szefa kuchni** w ramce z różową lewą krawędzią - NOWA FUNKCJA
- [ ] **Atrybucja:** "— Maciej Krawczun, Szef Kuchni MESO" - NOWA FUNKCJA
- [ ] Chipy alergenów: "Gluten", "Soja", "Sezam"

**Raport:**
```
Test 2.1 - Szczegóły produktu
Status: [PASS/FAIL]
Cena aktualna widoczna: [TAK/NIE]
Cena przekreślona widoczna: [TAK/NIE]
Kalorie widoczne: [TAK/NIE]
Cytat szefa widoczny: [TAK/NIE]
Atrybucja widoczna: [TAK/NIE]
Alergeny widoczne: [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 2.2: Wybór poziomu ostrości

**Kroki:**
1. Na stronie /menu/spicy-miso znajdź sekcję "Poziom Ostrości"
2. Kliknij na "Łagodny" (🔥)
3. Kliknij na "Średni" (🔥🔥)
4. Kliknij na "Piekielny" (🔥🔥🔥)

**Oczekiwany rezultat:**
- [ ] Trzy przyciski: Łagodny, Średni, Piekielny
- [ ] Każdy przycisk ma odpowiednią liczbę emoji ognia
- [ ] Kliknięty przycisk ma różową obwódkę i tło
- [ ] **WAŻNE:** Po wybraniu "Piekielny" pojawia się pomarańczowe ostrzeżenie:
  - "⚠️ Poziom Piekielny to nie żart! Bardzo ostra wersja dla doświadczonych fanów chilli."

**Raport:**
```
Test 2.2 - Wybór ostrości
Status: [PASS/FAIL]
Łagodny działa: [TAK/NIE]
Średni działa: [TAK/NIE]
Piekielny działa: [TAK/NIE]
Ostrzeżenie Piekielny widoczne: [TAK/NIE]
Treść ostrzeżenia: _____________________
Screenshot ostrzeżenia: [załącz]
Uwagi: _____________________
```

---

### Test 2.3: Wybór rozmiaru

**Kroki:**
1. Znajdź sekcję "Rozmiar"
2. Kliknij na "Standardowy (400ml)"
3. Kliknij na "Duży (550ml)"

**Oczekiwany rezultat:**
- [ ] Dwa przyciski rozmiarów
- [ ] "Standardowy" - domyślnie wybrany
- [ ] "Duży" - pokazuje "+8,00 zł"
- [ ] Wybrany rozmiar ma różową obwódkę
- [ ] Cena w przycisku CTA aktualizuje się po zmianie rozmiaru

**Raport:**
```
Test 2.3 - Wybór rozmiaru
Status: [PASS/FAIL]
Standardowy - cena w CTA: _____ zł
Duży - cena w CTA: _____ zł (powinna być +8 zł)
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 2.4: Wybór dodatków

**Kroki:**
1. Znajdź sekcję "Dodatki"
2. Zaznacz "Jajko marynowane (+5,00 zł)"
3. Zaznacz "Extra chashu (+12,00 zł)"
4. Odznacz "Jajko marynowane"

**Oczekiwany rezultat:**
- [ ] Lista dodatków z cenami
- [ ] Checkbox przy każdym dodatku
- [ ] Zaznaczone dodatki mają podświetlone tło
- [ ] Cena w CTA aktualizuje się dynamicznie
- [ ] Można zaznaczać i odznaczać wiele dodatków

**Raport:**
```
Test 2.4 - Wybór dodatków
Status: [PASS/FAIL]
Liczba dostępnych dodatków: _____
Cena po dodaniu Jajka: _____ zł
Cena po dodaniu Jajka + Chashu: _____ zł
Cena po usunięciu Jajka: _____ zł
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 2.5: Dodanie do koszyka

**Kroki:**
1. Wybierz: Średni (🔥🔥), Standardowy, Jajko marynowane
2. Kliknij przycisk "Dodaj do koszyka · XX,XX zł"

**Oczekiwany rezultat:**
- [ ] Przycisk CTA jest różowy z efektem świecenia
- [ ] Po kliknięciu pojawia się toast "Spicy Miso dodano do koszyka"
- [ ] Badge na ikonie koszyka pokazuje "1"

**Raport:**
```
Test 2.5 - Dodanie do koszyka
Status: [PASS/FAIL]
Toast pojawił się: [TAK/NIE]
Treść toasta: _____________________
Badge na koszyku: [TAK/NIE]
Wartość badge: _____
Screenshot: [załącz]
Uwagi: _____________________
```

---

## CZĘŚĆ 3: Koszyk (/cart)

### Test 3.1: Wyświetlanie koszyka

**Kroki:**
1. Po dodaniu produktu, przejdź do /cart
2. Sprawdź wszystkie elementy

**Oczekiwany rezultat:**
- [ ] Header "KOSZYK" z ikoną koszyka i badge
- [ ] Liczba produktów: "1 produkt"
- [ ] Karta produktu z:
  - Miniaturka obrazka
  - Nazwa: "Spicy Miso"
  - Wariant: "Standardowy (400ml)"
  - Ostrość: "🔥🔥" (jeśli wybrano Średni)
  - Cena
  - Kontrolki ilości: 🗑️ [1] [+]

**Raport:**
```
Test 3.1 - Wyświetlanie koszyka
Status: [PASS/FAIL]
Liczba produktów: _____
Szczegóły produktu widoczne: [TAK/NIE]
Ostrość wyświetlana: [TAK/NIE]
Wariant wyświetlany: [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 3.2: Zmiana ilości produktu

**Kroki:**
1. Kliknij przycisk [+] przy produkcie
2. Sprawdź czy ilość wzrosła do 2
3. Sprawdź czy cena się podwoiła
4. Kliknij przycisk [-] (lub 🗑️ jeśli ilość = 1)

**Oczekiwany rezultat:**
- [ ] [+] zwiększa ilość
- [ ] [-] zmniejsza ilość
- [ ] Przy ilości 1, przycisk minus zamienia się w kosz
- [ ] Kliknięcie kosza usuwa produkt
- [ ] Suma aktualizuje się automatycznie

**Raport:**
```
Test 3.2 - Zmiana ilości
Status: [PASS/FAIL]
Ilość 1 → 2: [TAK/NIE]
Cena podwoiła się: [TAK/NIE]
Ilość 2 → 1: [TAK/NIE]
Usunięcie (kosz): [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 3.3: Kod promocyjny

**Kroki:**
1. Dodaj produkt do koszyka (jeśli pusty)
2. W polu "Kod promocyjny" wpisz: `PIERWSZYRAMEN`
3. Kliknij "Zastosuj"

**Oczekiwany rezultat:**
- [ ] Pole input przyjmuje tekst
- [ ] Po kliknięciu "Zastosuj":
  - Kod pojawia się z badge "-15%"
  - Pojawia się przycisk X do usunięcia kodu
  - W podsumowaniu pojawia się linia "Rabat (PIERWSZYRAMEN): -X,XX zł"
  - **WAŻNE:** Cena w przycisku "Zamów" aktualizuje się do nowej wartości

**Raport:**
```
Test 3.3 - Kod promocyjny
Status: [PASS/FAIL]
Kod zaakceptowany: [TAK/NIE]
Badge -15% widoczny: [TAK/NIE]
Linia rabatu widoczna: [TAK/NIE]
Kwota rabatu: _____ zł
Cena w "Razem": _____ zł
Cena w przycisku "Zamów": _____ zł
Czy ceny się zgadzają: [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

**Dodatkowe kody do przetestowania:**
| Kod | Oczekiwany efekt |
|-----|------------------|
| `MESOCLUB` | -10% (min. 50 zł) |
| `DOSTAWAZERO` | Darmowa dostawa (min. 45 zł) |
| `NIEISTNIEJACY` | Błąd - nieprawidłowy kod |

---

### Test 3.4: Wybór napiwku

**Kroki:**
1. Znajdź sekcję "Napiwek dla kuriera"
2. Kliknij kolejno: "Bez napiwku", "5 zł", "10 zł", "15 zł"
3. Kliknij "Inna kwota" i wpisz 7

**Oczekiwany rezultat:**
- [ ] Domyślnie wybrany "Bez napiwku"
- [ ] Kliknięcie podświetla wybraną opcję (różowy)
- [ ] Suma "Razem" aktualizuje się po zmianie napiwku
- [ ] "Inna kwota" pozwala wpisać własną wartość

**Raport:**
```
Test 3.4 - Napiwek
Status: [PASS/FAIL]
Bez napiwku - suma: _____ zł
5 zł - suma: _____ zł
10 zł - suma: _____ zł
15 zł - suma: _____ zł
Inna kwota działa: [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 3.5: Podsumowanie zamówienia

**Kroki:**
1. Sprawdź sekcję podsumowania na dole koszyka

**Oczekiwany rezultat:**
- [ ] "Suma produktów: XX,XX zł"
- [ ] "Dostawa: 7,99 zł"
- [ ] "Rabat (KOD): -X,XX zł" (jeśli użyto kodu)
- [ ] "Napiwek: X zł" (jeśli dodano)
- [ ] **"Razem: XX,XX zł"** (pogrubione, różowe)
- [ ] Przycisk "Zamów · XX,XX zł" na dole (różowy z efektem świecenia)

**Raport:**
```
Test 3.5 - Podsumowanie
Status: [PASS/FAIL]
Suma produktów: _____ zł
Dostawa: _____ zł
Rabat: _____ zł
Napiwek: _____ zł
Razem (obliczone): _____ zł
Razem (wyświetlone): _____ zł
Czy się zgadza: [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 3.6: Minimalna wartość zamówienia

**Kroki:**
1. Usuń produkty z koszyka, aby suma była < 35 zł
2. Sprawdź czy można złożyć zamówienie

**Oczekiwany rezultat:**
- [ ] Pojawia się żółte ostrzeżenie o minimalnej wartości
- [ ] Przycisk "Zamów" jest nieaktywny (szary)
- [ ] Komunikat informuje ile brakuje do minimum

**Raport:**
```
Test 3.6 - Min. wartość zamówienia
Status: [PASS/FAIL]
Ostrzeżenie widoczne: [TAK/NIE]
Treść ostrzeżenia: _____________________
Przycisk nieaktywny: [TAK/NIE]
Screenshot: [załącz]
Uwagi: _____________________
```

---

## CZĘŚĆ 4: Testy responsywności

### Test 4.1: Widok mobilny (375x667)

**Kroki:**
1. Otwórz DevTools → Toggle Device Toolbar
2. Wybierz iPhone SE (375x667)
3. Przejdź przez: /menu → /menu/spicy-miso → /cart

**Oczekiwany rezultat:**
- [ ] Menu: Kategorie w poziomym scrollu lub hamburger menu
- [ ] Karty produktów: 1-2 kolumny
- [ ] Szczegóły: Pełnoekranowy layout
- [ ] Koszyk: Pełnoekranowy, przycisk CTA przyklejony na dole
- [ ] Dolna nawigacja widoczna (Home, Koszyk, Zamówienia, Profil)

**Raport:**
```
Test 4.1 - Mobile 375px
Status: [PASS/FAIL]
Menu OK: [TAK/NIE]
Szczegóły OK: [TAK/NIE]
Koszyk OK: [TAK/NIE]
Nawigacja dolna: [TAK/NIE]
Problemy z layoutem: _____________________
Screenshot: [załącz]
```

---

### Test 4.2: Widok tablet (768x1024)

**Kroki:**
1. Wybierz iPad (768x1024)
2. Przejdź przez wszystkie ekrany

**Oczekiwany rezultat:**
- [ ] Menu: Sidebar kategorii widoczny, 2-3 kolumny produktów
- [ ] Wszystkie elementy czytelne i klikalne

**Raport:**
```
Test 4.2 - Tablet 768px
Status: [PASS/FAIL]
Screenshot: [załącz]
Uwagi: _____________________
```

---

### Test 4.3: Widok desktop (1920x1080)

**Kroki:**
1. Ustaw rozdzielczość 1920x1080
2. Przejdź przez wszystkie ekrany

**Oczekiwany rezultat:**
- [ ] Menu: Pełny sidebar, 3-4 kolumny produktów
- [ ] Odpowiednie marginesy i padding

**Raport:**
```
Test 4.3 - Desktop 1920px
Status: [PASS/FAIL]
Screenshot: [załącz]
Uwagi: _____________________
```

---

## CZĘŚĆ 5: Testy persystencji danych

### Test 5.1: Koszyk po odświeżeniu strony

**Kroki:**
1. Dodaj 2 produkty do koszyka
2. Odśwież stronę (F5)
3. Sprawdź czy koszyk zachował produkty

**Oczekiwany rezultat:**
- [ ] Produkty pozostają w koszyku po odświeżeniu
- [ ] Ilości są zachowane
- [ ] Opcje (ostrość, rozmiar, dodatki) są zachowane

**Raport:**
```
Test 5.1 - Persystencja koszyka
Status: [PASS/FAIL]
Produkty zachowane: [TAK/NIE]
Ilości zachowane: [TAK/NIE]
Opcje zachowane: [TAK/NIE]
Uwagi: _____________________
```

---

## RAPORT KOŃCOWY

```
===========================================
MESO DELIVERY PWA - RAPORT TESTÓW MANUALNYCH
===========================================

Data testów: _______________
Tester: _______________
Środowisko: _______________
Przeglądarka: _______________

PODSUMOWANIE:
------------------------------------------
| Kategoria           | PASS | FAIL | N/A |
|---------------------|------|------|-----|
| Menu (/menu)        |      |      |     |
| Szczegóły produktu  |      |      |     |
| Koszyk (/cart)      |      |      |     |
| Responsywność       |      |      |     |
| Persystencja        |      |      |     |
------------------------------------------
| RAZEM               |      |      |     |
------------------------------------------

KRYTYCZNE BŁĘDY (blokujące):
1. _____________________
2. _____________________

BŁĘDY ŚREDNIE:
1. _____________________
2. _____________________

BŁĘDY NISKIE (kosmetyczne):
1. _____________________
2. _____________________

UWAGI OGÓLNE:
_____________________
_____________________

REKOMENDACJA:
[ ] READY FOR RELEASE
[ ] NEEDS FIXES - blokujące błędy
[ ] NEEDS FIXES - nieblokujące błędy

ZAŁĄCZNIKI:
- Screenshots: [folder/link]
- Video nagranie (opcjonalne): [link]
```

---

## INSTRUKCJE DLA TESTERA

1. **Wykonaj wszystkie testy w kolejności** - niektóre zależą od poprzednich
2. **Rób screenshoty** - szczególnie przy FAIL
3. **Zapisuj dokładne komunikaty błędów** - z konsoli i z UI
4. **Testuj na różnych przeglądarkach** - minimum Chrome + Safari
5. **Wypełnij raport końcowy** - nawet jeśli wszystko PASS

**Kontakt w razie pytań:** [dodaj kontakt]

---

*Dokument wygenerowany automatycznie dla MESO Delivery PWA*
