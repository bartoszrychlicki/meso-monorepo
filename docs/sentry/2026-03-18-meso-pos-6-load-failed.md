# Sentry debug: MESO-POS-6

## Zakres
- Data analizy: 2026-03-18
- Okno: ostatnie 24h
- Projekt: `pirxey/meso-pos`
- Issue: `MESO-POS-6`
- Link: https://pirxey.sentry.io/issues/104169112/

## Co się wydarzyło
Nowy issue z ostatnich 24h:
- `Error: [inventory_stock_items] findMany failed: TypeError: Load failed (gyxcdrcdnnzjdmcrwbpr.supabase.co)`
- `firstSeen`: 2026-03-17T11:50:41.680Z
- `lastSeen`: 2026-03-17T11:50:41.680Z
- `count`: 1
- Środowisko: `vercel-production`
- Strona: `/menu`

## Diagnoza
Na podstawie eventu i breadcrumbów:
- W krótkim czasie poleciało wiele równoległych requestów do endpointów Supabase REST.
- Błąd był po stronie transportu (`TypeError: Load failed`), nie SQL/RLS.
- Obecny retry w [`apps/pos/src/lib/data/supabase-repository.ts`](/Users/bartoszrychlicki/Development/Clients/Meso/meso-monorepo/apps/pos/src/lib/data/supabase-repository.ts) to tylko 2 próby i bardzo krótki backoff (120ms), więc przy krótkim dropie sieci może nie zdążyć się "odbić".

## Proponowana poprawka
1. Zwiększyć retry dla odczytów z 2 do 4 prób.
2. Zmienić backoff na wykładniczy z lekkim jitterem (np. ~150ms, 300ms, 600ms + losowe 0-80ms).
3. Utrzymać retry wyłącznie dla błędów sieciowych (`load failed`, `failed to fetch`, `network request failed`, itp.), bez retry dla błędów logiki/RLS.
4. Dodać test, że przy 2-3 chwilowych błędach sieciowych odczyt finalnie przechodzi.

## Dlaczego to jest bezpieczne
- Dotyczy tylko ścieżek read-only.
- Nie ukrywa błędów domenowych, bo retry pozostaje tylko dla sygnałów sieciowych.
- Zmniejsza noise w Sentry i poprawia UX przy chwilowych problemach sieci/CDN.

## Status
- Debug wykonany.
- Branch utworzony: `fix/sentry-meso-pos-6-load-failed`.
- W tym commicie celowo tylko raport/propozycja (bez ingerencji w istniejące zmiany robocze w repo).
