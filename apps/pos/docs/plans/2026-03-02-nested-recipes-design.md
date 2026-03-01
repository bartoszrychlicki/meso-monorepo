# Nested Recipes (Zagniezdzone receptury) — Design

## Problem

Receptury mogą zawierać tylko surowce (StockItem). Brak możliwości dodania półproduktu (np. patty wołowy) jako składnika receptury (np. cheeseburger). Koszty i alergeny nie propagują się przez zagnieżdżenia.

## Podejście

**Polimorficzne referencje (breaking change).** Pole `stock_item_id` zastąpione przez `type` + `reference_id`. Dane nie są produkcyjne — breaking change jest akceptowalny.

## Model danych

### RecipeIngredient (zmieniony)

```typescript
interface RecipeIngredient {
  id?: string;
  type: 'stock_item' | 'recipe';    // discriminator
  reference_id: string;              // UUID → StockItem lub Recipe
  reference_name?: string;           // denormalized display name
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  notes?: string;
}
```

**Usunięte pola:** `stock_item_id` (zastąpione przez `reference_id`)

**Reguły:**
- Tylko receptury `SEMI_FINISHED` mogą być dodane jako sub-składnik
- Tylko receptury `FINISHED_GOOD` mogą zawierać sub-receptury (max 2 poziomy)
- Receptura nie może odwoływać się do samej siebie (walidacja cykli)

### DB: brak zmian DDL

Kolumna `ingredients JSONB` automatycznie akceptuje nowe pola. Brak migracji Supabase.

## Kalkulacja kosztów (auto-propagacja)

```
calculateRecipeCost(recipe):
  for each ingredient:
    if type === 'stock_item':  line_cost = stockItem.cost_per_unit * quantity
    if type === 'recipe':      line_cost = subRecipe.cost_per_unit * quantity
  total_cost = sum(line_costs)
  cost_per_unit = total_cost / yield_quantity
```

**Propagacja w górę:** Gdy koszt sub-receptury (SEMI_FINISHED) się zmienia, system znajduje wszystkie FINISHED_GOOD receptury, które ją używają, i przelicza ich koszty.

Nowa metoda: `findRecipesUsingSubRecipe(recipeId)` — iteruje po recepturach, sprawdzając JSONB ingredients.

## Alergeny

```
getAllergensInRecipe(recipe):
  for each ingredient:
    if type === 'stock_item': add stockItem.allergens
    if type === 'recipe':     add subRecipe.allergens (already computed)
  return deduplicated set
```

Alergeny sub-receptury są już przeliczone i zapisane — nie trzeba rekurencji głębszej niż 1 poziom.

## UI: IngredientChecklist z zakładkami

Dwie zakładki w istniejącym IngredientChecklist:

- **Surowce** — obecna lista StockItem (domyślna)
- **Półprodukty** — receptury SEMI_FINISHED z `cost_per_unit`

Zakładka "Półprodukty" widoczna tylko gdy `product_category === FINISHED_GOOD`.

Każdy wiersz półproduktu pokazuje: nazwę receptury, koszt/jednostkę, pole quantity po zaznaczeniu.

## Walidacja Zod

`RecipeIngredientSchema` zmienia się na `z.discriminatedUnion('type', [...])` z dwoma wariantami (stock_item, recipe). Oba wymagają `reference_id` (UUID), `quantity` (positive), `unit` (min 1 char).

## Seed data

Wszystkie istniejące `RecipeIngredient`:
- Dodają `type: 'stock_item'`
- `stock_item_id` → `reference_id`

Nowy przykład zagnieżdżenia: Cheeseburger używa Patty wołowy (SEMI_FINISHED) zamiast bezpośredniego surowca wołowiny.

## Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `src/types/recipe.ts` | Nowy `RecipeIngredient` z `type` + `reference_id` |
| `src/schemas/recipe.ts` | `discriminatedUnion` zamiast flat schema |
| `src/modules/recipes/repository.ts` | Polimorficzny cost calc, propagacja, `findRecipesUsingSubRecipe()` |
| `src/modules/recipes/store.ts` | Propagacja kosztów po update |
| `src/modules/recipes/components/recipe-form.tsx` | Zakładki w IngredientChecklist |
| `src/modules/recipes/components/product-search-dialog.tsx` | Obsługa wyszukiwania receptur |
| `src/seed/data/recipes.ts` | Migracja format + nested example |
| Testy (`__tests__/`) | Nowe testy dla nested BOM, koszt propagacji, alergenów |
