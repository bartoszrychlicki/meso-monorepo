# Przewodnik Użytkownika - Moduł Magazynowy

## Spis Treści
1. [Przegląd Funkcji](#przegląd-funkcji)
2. [Dashboard Magazynowy](#dashboard-magazynowy)
3. [Operacje na Stanach](#operacje-na-stanach)
4. [Zarządzanie Partiami](#zarządzanie-partiami)
5. [Transfery Międzymagazynowe](#transfery-międzymagazynowe)
6. [Najlepsze Praktyki](#najlepsze-praktyki)
7. [FAQ](#faq)

---

## Przegląd Funkcji

Moduł magazynowy MESOpos oferuje kompleksowe narzędzia do:
- ✅ Monitorowania stanów magazynowych w czasie rzeczywistym
- 🔴 Śledzenia terminów ważności partii (FEFO - First Expired First Out)
- 🚚 Zarządzania transferami między magazynami (KC ↔ Punkty sprzedaży)
- 📊 Rejestrowania strat i odpadów (compliance HACCP)
- 📦 Automatycznego wydawania towaru według FEFO

---

## Dashboard Magazynowy

### Lokalizacja
**Menu → Magazyn**

### Widok Główny

#### 1. KPI Cards (Karty wskaźników)
Na górze dashboardu znajdziesz 3 główne wskaźniki:

| Wskaźnik | Co pokazuje |
|----------|-------------|
| **Pozycji łącznie** | Całkowita liczba produktów w magazynie |
| **Niski stan** | Ilość produktów poniżej minimalnego stanu |
| **Wartość magazynu** | Całkowita wartość towarów (PLN) |

#### 2. Alerty Krytyczne (Pełna szerokość)

##### 🚫 Partie Przeterminowane i Krytyczne
**Kolory alertów:**
- 🔴 **EXPIRED** (czerwony) - Partie przeterminowane
  - **AKCJA NATYCHMIASTOWA**: Usuń z magazynu!
  - Wymóg HACCP: Dokumentuj przyczynę i miejsce utylizacji

- 🟠 **CRITICAL** (pomarańczowy) - Partie krytyczne
  - Zbliża się termin ważności (< 3 dni)
  - **AKCJA**: Użyj w pierwszej kolejności, oznacz jako priorytet w produkcji

**Co widzisz:**
- Nazwa produktu i SKU
- Numer partii
- Czas do wygaśnięcia (np. "Wygasa za 2 dni" lub "Przeterminowane 1 dzień temu")
- Pozostała ilość w partii
- Data otwarcia (jeśli dotyczy)

**Przykład:**
```
🚫 PRZETERMINOWANE (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mleko UHT 3.2%
SKU: MLKO-001
Partia: BATCH-2024-0123
❌ Przeterminowane 2 dni temu
Ilość: 5.00 l

⚠️ HACCP: Przeterminowane partie muszą być
natychmiast usunięte z magazynu!
```

#### 3. Alerty Pomocnicze (2 kolumny)

##### ⏰ Partie Wygasające (Lewa kolumna)
Pokazuje partie wygasające w ciągu 7 dni (domyślnie)

**Kategorie:**
- **< 3 dni** - Krytyczne (czerwony)
- **< 7 dni** - Ostrzeżenie (pomarańczowy)
- **< 14 dni** - Informacja (żółty)

##### 📦 Niskie Stany (Prawa kolumna)
Produkty poniżej minimalnego poziomu

**Wyświetla:**
- Procent minimalnego stanu (np. 45%)
- Ilość dostępna vs minimum
- Ilość zarezerwowana (w zamówieniach)
- Ilość w transporcie (w drodze)

**Przykład:**
```
Mąka pszenna typ 500
SKU: MAKA-500
Dostępne: 12.50 kg
Min: 25.00 kg
● 50% ━━━━━━━━━━○○○○○○○○○○ 100%
Zarezerwowane: 2.50 kg
W drodze: 15.00 kg
```

---

## Operacje na Stanach

### Tabela Stanów Magazynowych

#### Kolumny
- **Produkt** - Nazwa produktu
- **Magazyn** - Lokalizacja
- **Ilość** - Stan dostępny (kolor według statusu)
- **Min** - Minimalny wymagany stan
- **Jednostka** - kg, szt, l, itp.
- **Status** - OK / Niski stan / Krytyczny
- **Akcje** - 4 przyciski operacji

#### Akcje (4 przyciski)

##### 1. ➕ Zwiększ Stan
**Kiedy używać:**
- Po dostawie towaru
- Korekta po inwentaryzacji (dodanie)
- Zwrot z produkcji

**Jak użyć:**
1. Kliknij zielony przycisk **+**
2. Wprowadź ilość do dodania
3. Podaj powód (np. "Dostawa 2024-02-08")
4. Kliknij **Potwierdź korektę**

**Przykład:**
```
Aktualny stan: 50.00 kg
Zmiana: +25.00 kg
Nowy stan: 75.00 kg
Powód: Dostawa od dostawcy ABC
```

##### 2. ➖ Zmniejsz Stan
**Kiedy używać:**
- Korekta po inwentaryzacji (odpisanie)
- Poprawka błędnego stanu

**Jak użyć:**
1. Kliknij czerwony przycisk **-**
2. Wprowadź ilość do odjęcia
3. Podaj powód (np. "Korekta inwentaryzacji")
4. Kliknij **Potwierdź korektę**

⚠️ **UWAGA**: Do rejestrowania strat **NIE UŻYWAJ** tej funkcji! Używaj przycisku 🗑️ **Zarejestruj stratę**

##### 3. 🚚 Wydaj Towar (FEFO)
**Co to jest FEFO?**
First Expired First Out - automatyczne wybieranie partii o najwcześniejszej dacie ważności.

**Kiedy używać:**
- Wydawanie towaru do produkcji
- Wydanie do punktu sprzedaży
- Realizacja zamówienia

**Jak użyć:**
1. Kliknij niebieski przycisk **🚚**
2. Wprowadź ilość potrzebną (np. 15 kg)
3. Kliknij **Pokaż podgląd FEFO**
4. Sprawdź które partie zostaną wybrane automatycznie:
   ```
   Partie do wydania (według daty ważności):

   Partia #1: BATCH-2024-0098
   Ważność: 2024-02-12
   Ilość: 10.00 kg

   Partia #2: BATCH-2024-0105
   Ważność: 2024-02-15
   Ilość: 5.00 kg

   ✅ FEFO gwarantuje, że partie o najwcześniejszej
   dacie ważności zostaną wydane jako pierwsze
   (zgodnie z HACCP).
   ```
5. Kliknij **Wydaj towar**

**Korzyści FEFO:**
- ✅ Automatyczna zgodność z HACCP
- ✅ Minimalizacja przeterminowań
- ✅ Brak ręcznej selekcji partii
- ✅ Pełna historia wydań

##### 4. 🗑️ Zarejestruj Stratę
**Kiedy używać:**
- Produkt przeterminowany
- Uszkodzenie opakowania/produktu
- Zepsucie (zmiana koloru, zapachu, pleśń)
- Kradzież
- Błąd w produkcji
- Inne straty

**Jak użyć:**
1. Kliknij czerwony przycisk **🗑️**
2. Wybierz **kategorię straty**:
   - 📅 Przeterminowanie
   - 📦 Uszkodzenie
   - 🦠 Zepsucie
   - 🚨 Kradzież
   - ⚠️ Błąd produkcji
   - 📝 Inne
3. Wprowadź **ilość straty** (np. 3.5 kg)
4. System automatycznie obliczy **wartość straty** w PLN
5. Opisz **szczegółowo przyczynę** (wymóg HACCP):
   ```
   Przykład dobrego opisu:
   "Produkt znaleziony po dacie ważności podczas
   codziennej kontroli magazynu. Data ważności:
   2024-02-05. Utylizacja zgodnie z procedurą
   HACCP nr 3.2. Potwierdził: Jan Kowalski"
   ```
6. Kliknij **Zarejestruj stratę**

**Co się dzieje:**
- ❌ Stan magazynowy zostaje zmniejszony
- 💰 Wartość straty zostaje zarejestrowana
- 📋 Wpis w dzienniku magazynowym
- 📊 Strata pojawi się w raportach

**⚠️ HACCP Note:**
Wszystkie straty z przyczyn bezpieczeństwa żywności (zepsucie, przeterminowanie) wymagają szczegółowej dokumentacji zgodnie z procedurami HACCP.

---

## Zarządzanie Partiami

### Lokalizacja
**Menu → Magazyn → Partie magazynowe**

### Widok Listy Partii

#### Filtry
- **Produkt** - Wybierz konkretny produkt
- **Status** - FRESH / WARNING / CRITICAL / EXPIRED

#### Kolumny Tabeli
| Kolumna | Opis |
|---------|------|
| Numer partii | Unikalny ID partii |
| Produkt | Nazwa i SKU |
| Data produkcji | Kiedy wyprodukowano |
| Data ważności | Termin przydatności |
| Ilość | Aktualna / początkowa |
| Status | Badge kolorowy |
| Akcje | Przycisk Edytuj |

#### Statusy Partii

| Status | Kolor | Znaczenie | Akcja |
|--------|-------|-----------|-------|
| 🟢 **FRESH** | Zielony | Świeża, dużo czasu | Normalne użycie |
| 🟡 **WARNING** | Żółty | Zbliża się data | Monitoruj |
| 🟠 **CRITICAL** | Pomarańczowy | Krytyczna, < 3 dni | **Priorytet w produkcji!** |
| 🔴 **EXPIRED** | Czerwony | Przeterminowana | **Natychmiastowe usunięcie!** |

### Edycja Partii

**Jak edytować:**
1. Znajdź partię w tabeli
2. Kliknij przycisk **Edytuj** (ostatnia kolumna)
3. W dialogu możesz:
   - ✏️ Zmienić **datę ważności**
   - 📅 Zmienić **datę produkcji**
   - 📦 Oznaczyć partię jako **"otwartą"**

#### Oznaczanie jako Otwarta
**Co to daje?**
Niektóre produkty mają skrócony termin przydatności **po otwarciu opakowania**.

**Przykład:**
- Mleko UHT (zamknięte): 6 miesięcy
- Mleko UHT (otwarte): 3 dni w lodówce

**Jak użyć:**
1. Otwórz edycję partii
2. Kliknij **Oznacz jako otwartą**
3. System automatycznie:
   - Zapisze datę otwarcia
   - Zapisze kto otworzył
   - Przeliczy termin ważności (jeśli produkt ma `shelf_life_after_opening`)
   - Zmieni status jeśli to konieczne

**Przykład:**
```
Partia: BATCH-2024-0123
Produkt: Mleko UHT 3.2%
Data ważności (przed otwarciem): 2024-08-01
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Oznacz jako otwartą] ← klik
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data ważności (po otwarciu): 2024-02-11 (3 dni)
Otwarte: 2024-02-08
Przez: Jan Kowalski
Status: CRITICAL ⚠️
```

---

## Transfery Międzymagazynowe

### Lokalizacja
**Menu → Magazyn → Transfery magazynowe**

### Typy Transferów
- **KC → Punkt sprzedaży** - Dostawa do food trucka/kiosku
- **Punkt → KC** - Zwrot niewykorzystanych produktów
- **Punkt → Punkt** - Przesunięcia awaryjne

### Workflow Transferu

#### Stany Transferu
```
1. PENDING (Oczekujące)
   ↓ [Przycisk: Wyślij]
2. IN_TRANSIT (W transporcie)
   ↓ [Przycisk: Odbierz]
3. COMPLETED (Zakończone)
```

#### Stan 1: PENDING (Oczekujące)
**Co to znaczy:**
- Transfer został utworzony
- Towar NIE został jeszcze zabrany z magazynu źródłowego
- Stany magazynowe **bez zmian**

**Dostępne akcje:**
- 🚚 **Wyślij** - Rozpocznij transport
- ❌ **Anuluj** - Usuń transfer (bez zmian w stanach)

#### Stan 2: IN_TRANSIT (W transporcie)
**Co to znaczy:**
- Towar został zabrany i jest w drodze
- Magazyn źródłowy: ⬇️ `quantity_available` (dostępne)
- Magazyn źródłowy: ⬆️ `quantity_in_transit` (w transporcie)

**Dostępne akcje:**
- 📦 **Odbierz** - Potwierdź dostawę
- ❌ **Anuluj** - Przerwij transport (przywróć stany źródłowe)

#### Stan 3: COMPLETED (Zakończone)
**Co to znaczy:**
- Towar dostarczony i odebrany
- Magazyn źródłowy: stan zmniejszony
- Magazyn docelowy: ⬆️ `quantity_available` (dostępne)
- Magazyn docelowy: ⬇️ `quantity_in_transit` (w transporcie)

**Dostępne akcje:**
- Brak (transfer zakończony)

### Przeprowadzenie Transferu - Krok po Kroku

#### Scenariusz: KC → Food Truck "Wawa 1"

**KROK 1: Wyślij Transfer**
1. Znajdź transfer w tabeli (status: PENDING)
2. Kliknij przycisk **🚚 Wyślij**
3. Przeczytaj dialog potwierdzenia:
   ```
   Wysłać przesunięcie?

   Przesunięcie TR-2024-0123 zostanie oznaczone
   jako "W drodze".

   Stany magazynowe w magazynie źródłowym zostaną
   zmniejszone, a ilości zostaną przeniesione do
   "W drodze".

   [Anuluj]  [Wyślij]
   ```
4. Kliknij **Wyślij**

**Co się dzieje:**
```
Magazyn KC (źródłowy):
  Dostępne: 100 kg → 85 kg (-15 kg)
  W transporcie: 0 kg → 15 kg (+15 kg)

Transfer:
  Status: PENDING → IN_TRANSIT
  Wysłany: 2024-02-08 10:30
  Przez: Jan Kowalski
```

**KROK 2: Odbierz Transfer**
1. Gdy towar dotrze do celu, otwórz transfer
2. Kliknij przycisk **📦 Odbierz**
3. Przeczytaj dialog:
   ```
   Odebrać przesunięcie?

   Przesunięcie TR-2024-0123 zostanie oznaczone
   jako "Odebrane".

   Stany magazynowe w magazynie docelowym zostaną
   zwiększone, a ilości "W drodze" zostaną
   zmniejszone.

   [Anuluj]  [Odbierz]
   ```
4. Kliknij **Odbierz**

**Co się dzieje:**
```
Magazyn KC (źródłowy):
  Dostępne: 85 kg (bez zmian)
  W transporcie: 15 kg → 0 kg (-15 kg)

Magazyn Wawa 1 (docelowy):
  Dostępne: 20 kg → 35 kg (+15 kg)
  W transporcie: 15 kg → 0 kg (-15 kg)

Transfer:
  Status: IN_TRANSIT → COMPLETED
  Odebrany: 2024-02-08 14:15
  Przez: Anna Nowak
```

### Anulowanie Transferu

#### Anulowanie w stanie PENDING
**Skutki:** Brak zmian w stanach magazynowych (transfer nie był jeszcze wysłany)

#### Anulowanie w stanie IN_TRANSIT
**Skutki:**
- ✅ Stany magazynu źródłowego zostaną przywrócone
- ✅ `quantity_in_transit` zostanie zmniejszone
- ✅ `quantity_available` zostanie zwiększone

**Przykład:**
```
Transfer TR-2024-0123: 15 kg Mąki
Status: IN_TRANSIT

[Anuluj] ← klik

Powód anulowania:
"Uszkodzenie opakowania podczas załadunku"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Magazyn KC:
  Przed: Dostępne 85 kg, W transporcie 15 kg
  Po:    Dostępne 100 kg, W transporcie 0 kg
```

---

## Najlepsze Praktyki

### 🌅 Codzienna Rutyna (Rano)

1. **Sprawdź Dashboard** (5 min)
   - Otwórz **Magazyn**
   - Przejrzyj alert **🚫 Partie Krytyczne**
   - Jeśli są przeterminowane → natychmiastowe usunięcie
   - Jeśli są krytyczne → zaplanuj priorytetowe użycie

2. **Zaplanuj Produkcję** (10 min)
   - Sprawdź partie krytyczne (< 3 dni)
   - Poinformuj kuchnię o priorytetach
   - Użyj funkcji **Wydaj towar (FEFO)** - automatycznie wybierze właściwe partie

3. **Sprawdź Niskie Stany** (5 min)
   - Widget **📦 Niskie Stany**
   - Złóż zamówienia na braki
   - Sprawdź czy są transfery **W transporcie**

### 📦 Przyjęcie Dostawy

1. **Sprawdź dokumenty**
   - Nr partii, daty ważności, ilości

2. **Zarejestruj dostawę**
   - Użyj **➕ Zwiększ Stan** dla każdego produktu
   - Powód: "Dostawa WZ-123456 od [Dostawca]"

3. **Nie używaj FEFO do przyjęć!**
   - FEFO jest tylko do **wydawania** towaru
   - Do przyjęć używaj **➕ Zwiększ stan**

### 🚚 Wydawanie Towaru

**ZAWSZE używaj funkcji 🚚 Wydaj towar (FEFO)**

❌ **ŹLE:**
```
Użycie przycisku ➖ Zmniejsz stan
→ Nie wiadomo która partia
→ Brak zgodności z HACCP
→ Ryzyko przeterminowania
```

✅ **DOBRZE:**
```
Użycie przycisku 🚚 Wydaj towar (FEFO)
→ Automatyczny wybór najstarszych partii
→ Pełna zgodność z HACCP
→ Minimalizacja strat
```

### 📋 Rejestrowanie Strat

**DO:**
- ✅ Używaj dedykowanej funkcji 🗑️ **Zarejestruj stratę**
- ✅ Wybieraj właściwą kategorię
- ✅ Opisuj szczegółowo przyczynę
- ✅ Dokumentuj wszystkie straty (również małe)

**NIE:**
- ❌ Nie używaj ➖ Zmniejsz stan do strat
- ❌ Nie pomijaj rejestracji małych strat
- ❌ Nie używaj ogólnych opisów ("różne")

### 🔄 Transfery

**DO:**
- ✅ Wysyłaj transfery tego samego dnia
- ✅ Odbieraj natychmiast po dostawie
- ✅ Sprawdzaj ilości przed odbiorem

**NIE:**
- ❌ Nie zostawiaj transferów w PENDING przez długi czas
- ❌ Nie odbieraj bez fizycznej obecności towaru
- ❌ Nie anuluj bez uzasadnionej przyczyny

### 📊 Koniec Tygodnia

1. **Przegląd partii wygasających**
   - Sprawdź widget **⏰ Partie Wygasające**
   - Zaplanuj wykorzystanie na kolejny tydzień

2. **Analiza strat**
   - Przejrzyj zarejestrowane straty
   - Zidentyfikuj powracające problemy
   - Działania zapobiegawcze

---

## FAQ

### Pytania Ogólne

**Q: Czym różni się "Zmniejsz stan" od "Zarejestruj stratę"?**
A:
- **Zmniejsz stan** (➖) - Korekty, poprawki błędów, zwroty. Bez kategorii, bez raportowania strat.
- **Zarejestruj stratę** (🗑️) - Faktyczne straty, przeterminowania, uszkodzenia. Z kategorią, wartością, w raportach.

**Q: Czy mogę edytować transfer już wysłany?**
A: Nie. Transfer w stanie IN_TRANSIT lub COMPLETED można tylko anulować (jeśli IN_TRANSIT) lub zostawić. Jeśli potrzebujesz zmian, anuluj i utwórz nowy.

**Q: Co to jest FEFO?**
A: First Expired First Out - metodologia wydawania towaru, gdzie produkty o najwcześniejszej dacie ważności są wydawane jako pierwsze. Wymóg HACCP w branży spożywczej.

**Q: Dlaczego widzę "W transporcie" w stanach?**
A: To towar, który został wysłany transferem ale jeszcze nie został odebrany. Jest "zamrożony" między magazynami.

### Problemy i Rozwiązania

**Q: Pomyłkowo zaznaczyłem partię jako otwartą. Jak cofnąć?**
A: Edytuj partię → zmień datę otwarcia na pustą lub datę ważności z powrotem na oryginalną.

**Q: Wysłałem transfer do złego magazynu. Co robić?**
A:
1. Jeśli status = PENDING: Anuluj i utwórz nowy
2. Jeśli status = IN_TRANSIT: Anuluj (przywróci stany) i utwórz nowy
3. Jeśli status = COMPLETED: Utwórz transfer zwrotny w drugą stronę

**Q: Partia pokazuje CRITICAL ale data ważności to za 5 dni?**
A: Sprawdź czy partia została oznaczona jako "otwarta". Jeśli tak, system liczy skrócony termin przydatności po otwarciu.

**Q: Nie mogę wydać towaru przez FEFO - brak dostępnych partii**
A: Sprawdź:
1. Czy są partie w magazynie?
2. Czy partie mają status FRESH/WARNING/CRITICAL? (EXPIRED nie są wydawane)
3. Czy żądana ilość nie przekracza dostępnej?

### HACCP i Compliance

**Q: Jakie dokumenty są wymagane przy stratach?**
A: System automatycznie rejestruje:
- Datę i czas
- Użytkownika
- Kategorię straty
- Ilość i wartość
- Szczegółowy opis

To wystarczy dla większości audytów. Dla kradzieży dodatkowo zalecamy zewnętrzne zgłoszenie.

**Q: Jak często aktualizować statusy partii?**
A: System ma przycisk "Zaktualizuj statusy" który przelicza wszystkie partie. Uruchamiaj:
- Rano (codziennie)
- Po edycji partii
- Przed ważnymi audytami

**Q: Czy system wysyła powiadomienia o przeterminowaniach?**
A: Obecnie nie (planowane w przyszłości). Dashboard pokazuje alerty w czasie rzeczywistym. Sprawdzaj codziennie.

---

## Kontakt i Wsparcie

### Przycisk Pomocy
Na każdej stronie magazynu w prawym górnym rogu znajdziesz przycisk **🛈 Pomoc** z tym przewodnikiem.

### Zgłaszanie Błędów
Jeśli znajdziesz błąd w systemie:
1. Zapisz screenshot
2. Zanotuj kroki prowadzące do błędu
3. Zgłoś do administratora systemu

### Szkolenia
Dla nowych użytkowników zalecamy:
- 30 min wprowadzenie do dashboardu
- 1h praktyczne szkolenie z operacji (FEFO, straty, transfery)
- 30 min zarządzanie partiami

---

**Wersja dokumentu:** 1.0
**Data ostatniej aktualizacji:** 2024-02-08
**System:** MESOpos - Moduł Magazynowy
