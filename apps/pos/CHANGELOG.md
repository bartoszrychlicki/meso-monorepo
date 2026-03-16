# Changelog

Wszystkie istotne zmiany w MESOpos zapisujemy tutaj.

## 0.2.0 - 2026-03-16

### Dodane
- Pelny workflow inwentaryzacji magazynow w module `Magazyn`, z dokumentami `draft -> approved -> cancelled`.
- Nowa inwentaryzacja dla pojedynczego magazynu albo zakresu `Wszystkie`, z grupowaniem pozycji per magazyn.
- Edycja stanu policzonego, kategorii, polozenia i uwagi bezposrednio w wierszu inwentaryzacji.
- Zapisywanie draftu inwentaryzacji na biezaco i zatwierdzanie zmian stanowych dopiero po akceptacji calego dokumentu.
- Migracja bazy dla dokumentow inwentaryzacji oraz polozenia produktu per magazyn.

### Zmienione
- Widok `Magazyn` zostal skondensowany, z bardziej zwartym ukladem akcji, filtrow i tabel.
- Tabela stanow magazynowych pokazuje teraz dane w bardziej zwartej formie, z mniejsza liczba szerokich kolumn.
- Ekran liczenia inwentaryzacji dostal jednoliniowy uklad wierszy, krotsze pola edycji i czytelniejsze oznaczenie roznic wraz z jednostka.
- Polozenie produktu jest teraz traktowane jako informacja per magazyn, zamiast jednego globalnego pola dla calej kartoteki.

### Naprawione
- Poprawiono formatowanie roznic ilosci, zeby nie wyswietlac artefaktow liczb zmiennoprzecinkowych.
- Przywrocono przewijanie dlugiego ekranu szczegolow inwentaryzacji.
- Naprawiono kontrast i highlighty wierszy inwentaryzacji w trybie ciemnym.
