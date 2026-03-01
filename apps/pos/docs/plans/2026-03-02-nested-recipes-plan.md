# Nested Recipes (BOM) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow recipes to contain other recipes (SEMI_FINISHED) as ingredients, with auto-propagating costs and allergens.

**Architecture:** Replace `stock_item_id` with polymorphic `type` + `reference_id` on `RecipeIngredient`. Cost calculation resolves sub-recipe costs via `subRecipe.cost_per_unit`. UI adds a "Polprodukty" tab to the ingredient checklist. Max 2 levels of nesting (FINISHED_GOOD -> SEMI_FINISHED).

**Tech Stack:** TypeScript, Zod, Zustand, React Hook Form, Vitest, Next.js App Router

---

### Task 1: Update RecipeIngredient type

**Files:**
- Modify: `apps/pos/src/types/recipe.ts:15-22`

**Step 1: Update the RecipeIngredient interface**

Replace lines 15-22 with:

```typescript
export interface RecipeIngredient {
  id?: string;
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name?: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  notes?: string;
}
```

**Step 2: Update AllergenSource interface**

Replace lines 105-109 with:

```typescript
export interface AllergenSource {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name: string;
  allergens: Allergen[];
}
```

**Step 3: Update RecipeCostBreakdown ingredient type**

Replace lines 118-126 with:

```typescript
  ingredients: {
    type: 'stock_item' | 'recipe';
    reference_id: string;
    reference_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    percentage_of_total: number;
  }[];
```

**Step 4: Run type check**

Run: `cd apps/pos && npx tsc --noEmit 2>&1 | head -60`
Expected: Errors — many files still reference `stock_item_id`. This is expected; we fix them in subsequent tasks.

**Step 5: Commit**

```bash
git add apps/pos/src/types/recipe.ts
git commit -m "refactor(recipes): update RecipeIngredient to polymorphic type+reference_id"
```

---

### Task 2: Update Zod schema

**Files:**
- Modify: `apps/pos/src/schemas/recipe.ts:13-24`

**Step 1: Replace RecipeIngredientSchema with discriminated union**

Replace lines 13-24 with:

```typescript
const StockItemIngredientSchema = z.object({
  type: z.literal('stock_item'),
  reference_id: z.string().uuid('ID skladnika musi byc prawidlowym UUID'),
  reference_name: z.string().optional(),
  quantity: z
    .number()
    .positive('Ilosc musi byc wieksza od 0')
    .describe('Ilosc skladnika potrzebna w recepturze'),
  unit: z
    .string()
    .min(1, 'Jednostka jest wymagana')
    .describe('Jednostka miary (g, ml, szt)'),
  notes: z.string().optional().describe('Dodatkowe notatki do skladnika'),
});

const RecipeRefIngredientSchema = z.object({
  type: z.literal('recipe'),
  reference_id: z.string().uuid('ID receptury musi byc prawidlowym UUID'),
  reference_name: z.string().optional(),
  quantity: z
    .number()
    .positive('Ilosc musi byc wieksza od 0')
    .describe('Ilosc polproduktu potrzebna w recepturze'),
  unit: z
    .string()
    .min(1, 'Jednostka jest wymagana')
    .describe('Jednostka miary'),
  notes: z.string().optional().describe('Dodatkowe notatki'),
});

export const RecipeIngredientSchema = z.discriminatedUnion('type', [
  StockItemIngredientSchema,
  RecipeRefIngredientSchema,
]);
```

**Step 2: Update CalculateRecipeCostSchema to use new schema**

The `CalculateRecipeCostSchema` at line 91 references `RecipeIngredientSchema` — this still works since the export name is unchanged.

**Step 3: Run type check**

Run: `cd apps/pos && npx tsc --noEmit 2>&1 | head -60`
Expected: Still some errors from downstream files (repository, components, etc.)

**Step 4: Commit**

```bash
git add apps/pos/src/schemas/recipe.ts
git commit -m "refactor(recipes): update Zod schema to discriminated union"
```

---

### Task 3: Update menu module types (RecipeIngredient in menu.ts)

**Files:**
- Modify: `apps/pos/src/types/menu.ts:112-117`
- Modify: `apps/pos/src/schemas/menu.ts:59-63`
- Modify: `apps/pos/src/modules/menu/utils/food-cost.ts`
- Modify: `apps/pos/src/modules/menu/components/ingredient-selector.tsx`

**Step 1: Update RecipeIngredient in menu.ts**

Replace lines 112-117:

```typescript
export interface RecipeIngredient {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name: string;
  quantity: number;
  unit: string;
}
```

**Step 2: Update RecipeIngredientSchema in schemas/menu.ts**

Replace the schema around line 59:

```typescript
  type: z.enum(['stock_item', 'recipe']).default('stock_item'),
  reference_id: z.string().min(1),
  reference_name: z.string().min(1),
  quantity: z.number().positive('Ilosc musi byc wieksza niz 0'),
  unit: z.string().min(1),
```

**Step 3: Update food-cost.ts**

In `apps/pos/src/modules/menu/utils/food-cost.ts`, replace `stock_item_id` references with `reference_id`:

```typescript
export interface FoodCostResult {
  totalCost: number;
  costPercentage: number;
  ingredientCosts: { reference_id: string; cost: number }[];
}

export function calculateFoodCost(
  ingredients: RecipeIngredient[],
  stockItems: StockItem[],
  productPrice: number
): FoodCostResult {
  const stockItemMap = new Map(stockItems.map((s) => [s.id, s]));

  const ingredientCosts = ingredients.map((ingredient) => {
    // Only resolve cost for stock_item type; recipe type would need sub-recipe lookup
    const stockItem = ingredient.type === 'stock_item' ? stockItemMap.get(ingredient.reference_id) : undefined;
    const cost = stockItem ? ingredient.quantity * stockItem.cost_per_unit : 0;
    return { reference_id: ingredient.reference_id, cost };
  });

  const totalCost = Math.round(ingredientCosts.reduce((sum, ic) => sum + ic.cost, 0) * 100) / 100;
  const costPercentage = productPrice > 0 ? (totalCost / productPrice) * 100 : 0;

  return { totalCost, costPercentage, ingredientCosts };
}
```

**Step 4: Update ingredient-selector.tsx**

In `apps/pos/src/modules/menu/components/ingredient-selector.tsx`, replace all `stock_item_id` → `reference_id` and `stock_item_name` → `reference_name`. Add `type: 'stock_item'` when creating new ingredients:

- Line 43: `const usedIds = new Set(ingredients.map((i) => i.reference_id));`
- Line 48-55: Add `type: 'stock_item' as const` to new ingredient object, use `reference_id` and `reference_name`
- Line 70-76: Use `reference_id` and `reference_name`
- Line 107: `stockItemMap.get(ingredient.reference_id)`
- Line 119: `value={ingredient.reference_id}`
- Line 130: `disabled={usedIds.has(s.id) && s.id !== ingredient.reference_id}`

**Step 5: Commit**

```bash
git add apps/pos/src/types/menu.ts apps/pos/src/schemas/menu.ts apps/pos/src/modules/menu/utils/food-cost.ts apps/pos/src/modules/menu/components/ingredient-selector.tsx
git commit -m "refactor(menu): migrate RecipeIngredient to polymorphic type+reference_id"
```

---

### Task 4: Update repository — cost calculation and allergens

**Files:**
- Modify: `apps/pos/src/modules/recipes/repository.ts`

**Step 1: Update calculateRecipeCost**

Replace the `calculateRecipeCost` method (lines 66-122) with:

```typescript
  async calculateRecipeCost(recipe: Recipe): Promise<RecipeCostBreakdown> {
    const allStockItems = await inventoryRepository.getAllStockItems();
    const stockItemMap = new Map(allStockItems.map((s) => [s.id, s]));

    const ingredientDetails = await Promise.all(
      recipe.ingredients.map(async (ing) => {
        if (ing.type === 'recipe') {
          const subRecipe = await recipesRepo.findById(ing.reference_id);
          if (!subRecipe) {
            throw new Error(`Sub-recipe not found: ${ing.reference_id}`);
          }
          const lineCost = ing.quantity * subRecipe.cost_per_unit;
          return {
            type: 'recipe' as const,
            reference_id: subRecipe.id,
            reference_name: subRecipe.name,
            quantity: ing.quantity,
            unit: ing.unit,
            cost_per_unit: subRecipe.cost_per_unit,
            total_cost: lineCost,
            percentage_of_total: 0,
          };
        }

        // type === 'stock_item'
        const stockItem = stockItemMap.get(ing.reference_id);
        if (!stockItem) {
          throw new Error(`Stock item not found: ${ing.reference_id}`);
        }
        const lineCost = ing.quantity * stockItem.cost_per_unit;
        return {
          type: 'stock_item' as const,
          reference_id: stockItem.id,
          reference_name: stockItem.name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: stockItem.cost_per_unit,
          total_cost: lineCost,
          percentage_of_total: 0,
        };
      })
    );

    const totalCost = ingredientDetails.reduce((sum, ing) => sum + ing.total_cost, 0);
    ingredientDetails.forEach((ing) => {
      ing.percentage_of_total = totalCost > 0 ? (ing.total_cost / totalCost) * 100 : 0;
    });

    const costPerUnit = totalCost / recipe.yield_quantity;
    const sellingPrice = null;
    const foodCostPercentage = sellingPrice ? (totalCost / sellingPrice) * 100 : null;

    return {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      ingredients: ingredientDetails,
      total_cost: totalCost,
      yield_quantity: recipe.yield_quantity,
      cost_per_unit: costPerUnit,
      selling_price: sellingPrice,
      food_cost_percentage: foodCostPercentage,
      calculated_at: new Date(),
    };
  },
```

**Step 2: Update getAllergensInRecipe**

Replace lines 133-158 with:

```typescript
  async getAllergensInRecipe(recipe: Recipe): Promise<Allergen[]> {
    const allergenSet = new Set<Allergen>();
    const allStockItems = await inventoryRepository.getAllStockItems();
    const stockItemMap = new Map(allStockItems.map((s) => [s.id, s]));

    for (const ingredient of recipe.ingredients) {
      if (ingredient.type === 'recipe') {
        const subRecipe = await recipesRepo.findById(ingredient.reference_id);
        if (subRecipe) {
          subRecipe.allergens.forEach((a) => allergenSet.add(a));
        }
        continue;
      }
      // type === 'stock_item'
      const stockItem = stockItemMap.get(ingredient.reference_id);
      if (!stockItem) continue;
      stockItem.allergens.forEach((a) => allergenSet.add(a));
    }

    return Array.from(allergenSet);
  },
```

**Step 3: Update getAllergenSources**

Replace lines 168-186 with:

```typescript
  async getAllergenSources(recipe: Recipe): Promise<AllergenSource[]> {
    const sources: AllergenSource[] = [];
    const allStockItems = await inventoryRepository.getAllStockItems();
    const stockItemMap = new Map(allStockItems.map((s) => [s.id, s]));

    for (const ingredient of recipe.ingredients) {
      if (ingredient.type === 'recipe') {
        const subRecipe = await recipesRepo.findById(ingredient.reference_id);
        if (subRecipe && subRecipe.allergens.length > 0) {
          sources.push({
            type: 'recipe',
            reference_id: subRecipe.id,
            reference_name: subRecipe.name,
            allergens: subRecipe.allergens,
          });
        }
        continue;
      }
      const stockItem = stockItemMap.get(ingredient.reference_id);
      if (!stockItem || stockItem.allergens.length === 0) continue;
      sources.push({
        type: 'stock_item',
        reference_id: stockItem.id,
        reference_name: stockItem.name,
        allergens: stockItem.allergens,
      });
    }

    return sources;
  },
```

**Step 4: Add findRecipesUsingSubRecipe method**

Add this new method before `getRecipesWithAllergen`:

```typescript
  /**
   * Find all recipes that use a given recipe as a sub-ingredient
   */
  async findRecipesUsingSubRecipe(recipeId: string): Promise<Recipe[]> {
    return recipesRepo.findMany(
      (r) =>
        r.is_active &&
        r.ingredients.some(
          (ing) => ing.type === 'recipe' && ing.reference_id === recipeId
        )
    );
  },
```

**Step 5: Update updateRecipeWithVersioning for cost propagation**

After line 280 (after the recalculation block), add:

```typescript
    // Propagate cost changes to parent recipes that use this as sub-ingredient
    if (data.ingredients) {
      const parentRecipes = await this.findRecipesUsingSubRecipe(recipeId);
      for (const parent of parentRecipes) {
        const parentCost = await this.calculateRecipeCost(parent);
        const parentAllergens = await this.getAllergensInRecipe(parent);
        await recipesRepo.update(parent.id, {
          total_cost: parentCost.total_cost,
          cost_per_unit: parentCost.cost_per_unit,
          food_cost_percentage: parentCost.food_cost_percentage,
          allergens: parentAllergens,
          updated_at: new Date().toISOString(),
        });
      }
    }
```

**Step 6: Commit**

```bash
git add apps/pos/src/modules/recipes/repository.ts
git commit -m "feat(recipes): polymorphic cost calc, allergens, and upward propagation"
```

---

### Task 5: Update store for cost cache invalidation of parents

**Files:**
- Modify: `apps/pos/src/modules/recipes/store.ts`

**Step 1: Clear parent cost caches on recipe update**

In `updateRecipe` (around line 147-150), after clearing this recipe's cache, also clear all parent recipe caches. Since we don't know which parents exist without querying, the simplest approach is to clear the entire `costBreakdowns` map when any recipe with ingredients changes:

Replace lines 147-150:

```typescript
      // Clear cost cache (this recipe + any parents that may reference it)
      set({ costBreakdowns: new Map(), allergenSources: new Map() });
```

**Step 2: Commit**

```bash
git add apps/pos/src/modules/recipes/store.ts
git commit -m "feat(recipes): clear all cost caches on recipe update for propagation"
```

---

### Task 6: Update recipe-calculator.ts utility

**Files:**
- Modify: `apps/pos/src/modules/recipes/utils/recipe-calculator.ts`

**Step 1: Update validateRecipeIngredients**

Replace lines 236-263. Change `stock_item_id` references to `reference_id`:

```typescript
export function validateRecipeIngredients(
  ingredients: RecipeIngredient[]
): string[] {
  const errors: string[] = [];

  if (ingredients.length === 0) {
    errors.push('Receptura musi zawierac przynajmniej jeden skladnik');
  }

  // Check for duplicate ingredients (same type + same reference_id)
  const seen = new Set<string>();
  for (const ing of ingredients) {
    const key = `${ing.type}:${ing.reference_id}`;
    if (seen.has(key)) {
      errors.push('Receptura zawiera duplikaty skladnikow');
      break;
    }
    seen.add(key);
  }

  // Check for zero or negative quantities
  ingredients.forEach((ing, index) => {
    if (ing.quantity <= 0) {
      errors.push(`Skladnik #${index + 1} ma nieprawidlowa ilosc`);
    }
  });

  return errors;
}
```

**Step 2: Commit**

```bash
git add apps/pos/src/modules/recipes/utils/recipe-calculator.ts
git commit -m "refactor(recipes): update recipe-calculator for reference_id"
```

---

### Task 7: Update recipe detail page

**Files:**
- Modify: `apps/pos/src/app/(dashboard)/recipes/[id]/page.tsx`

**Step 1: Update getStockItemName to handle both types**

Replace `getStockItemName` (line 61-62) and `getIngredientCost` (lines 67-70):

```typescript
  const getIngredientName = (ing: RecipeIngredient) => {
    if (ing.reference_name) return ing.reference_name;
    if (ing.type === 'stock_item') {
      return stockItems.find((s) => s.id === ing.reference_id)?.name ?? ing.reference_id;
    }
    return ing.reference_id;
  };

  const getIngredientCost = (ing: RecipeIngredient) => {
    if (ing.type === 'recipe') {
      // Cost comes from sub-recipe's cost_per_unit (stored at recipe level)
      return ing.cost_per_unit ? ing.quantity * ing.cost_per_unit : 0;
    }
    const item = stockItems.find((s) => s.id === ing.reference_id);
    return item ? ing.quantity * item.cost_per_unit : 0;
  };
```

Add at top: `import { RecipeIngredient } from '@/types/recipe';`

**Step 2: Update template references**

In the ingredients table mapping (around line 210-234), replace:
- `getStockItemName(ing.stock_item_id)` → `getIngredientName(ing)`
- `getIngredientCost(ing.stock_item_id, ing.quantity)` → `getIngredientCost(ing)`
- `data-ingredient={ing.stock_item_id}` → `data-ingredient={ing.reference_id}`

Also add a badge for recipe-type ingredients:
```tsx
{ing.type === 'recipe' && (
  <Badge variant="outline" className="ml-1 text-[10px]">polprodukt</Badge>
)}
```

**Step 3: Commit**

```bash
git add apps/pos/src/app/(dashboard)/recipes/[id]/page.tsx
git commit -m "feat(recipes): update recipe detail page for nested ingredients"
```

---

### Task 8: Update recipe form — IngredientChecklist with tabs

**Files:**
- Modify: `apps/pos/src/modules/recipes/components/recipe-form.tsx`

**Step 1: Update RecipeIngredientField interface**

Replace lines 49-53:

```typescript
interface RecipeIngredientField {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name?: string;
  quantity: number;
  unit: string;
}
```

**Step 2: Update IngredientChecklistProps**

Add a `recipes` prop for SEMI_FINISHED recipes and a `productCategory` prop:

```typescript
interface IngredientChecklistProps {
  stockItems: StockItem[];
  semiFinishedRecipes: Recipe[];
  productCategory: ProductCategory;
  form: { setValue: (name: string, value: unknown) => void };
  append: (value: RecipeIngredientField) => void;
  remove: (index: number) => void;
  ingredientSearch: string;
  setIngredientSearch: (value: string) => void;
  estimatedCost: number;
  onSaveIngredients?: (ingredients: RecipeIngredientField[]) => Promise<void>;
  isSavingIngredients: boolean;
  setIsSavingIngredients: (value: boolean) => void;
  watchedIngredients: RecipeIngredientField[];
}
```

**Step 3: Add tab state and update IngredientChecklist**

Inside `IngredientChecklist`, add tab state:

```typescript
const [activeTab, setActiveTab] = useState<'stock_items' | 'recipes'>('stock_items');
const showRecipesTab = productCategory === ProductCategory.FINISHED_GOOD;
```

Update `selectedIds` to use `reference_id`:
```typescript
const selectedIds = useMemo(() => {
  return new Set(
    (watchedIngredients || [])
      .map((ing) => `${ing.type}:${ing.reference_id}`)
      .filter(Boolean)
  );
}, [watchedIngredients]);
```

Update `handleToggle` for stock items:
```typescript
const handleToggleStockItem = (stockItem: StockItem, checked: boolean) => {
  if (checked) {
    append({ type: 'stock_item', reference_id: stockItem.id, reference_name: stockItem.name, quantity: 1, unit: stockItem.unit });
  } else {
    const idx = (watchedIngredients || []).findIndex(
      (ing) => ing.type === 'stock_item' && ing.reference_id === stockItem.id
    );
    if (idx >= 0) remove(idx);
  }
};
```

Add `handleToggleRecipe`:
```typescript
const handleToggleRecipe = (recipe: Recipe, checked: boolean) => {
  if (checked) {
    append({ type: 'recipe', reference_id: recipe.id, reference_name: recipe.name, quantity: 1, unit: recipe.yield_unit });
  } else {
    const idx = (watchedIngredients || []).findIndex(
      (ing) => ing.type === 'recipe' && ing.reference_id === recipe.id
    );
    if (idx >= 0) remove(idx);
  }
};
```

Filter helpers for stock items and recipes:
```typescript
const selectedStockIds = new Set(
  (watchedIngredients || []).filter((i) => i.type === 'stock_item').map((i) => i.reference_id)
);
const selectedRecipeIds = new Set(
  (watchedIngredients || []).filter((i) => i.type === 'recipe').map((i) => i.reference_id)
);

const selectedStockItems = stockItems.filter((s) => selectedStockIds.has(s.id));
const availableStockItems = stockItems
  .filter((s) => !selectedStockIds.has(s.id))
  .filter((s) => !searchLower || s.name.toLowerCase().includes(searchLower));

const selectedRecipes = semiFinishedRecipes.filter((r) => selectedRecipeIds.has(r.id));
const availableRecipes = semiFinishedRecipes
  .filter((r) => !selectedRecipeIds.has(r.id))
  .filter((r) => !searchLower || r.name.toLowerCase().includes(searchLower));
```

**Step 4: Add tabs UI**

After the search input, add tab buttons (only when `showRecipesTab` is true):

```tsx
{showRecipesTab && (
  <div className="flex gap-1 border-b">
    <button
      type="button"
      className={cn(
        'px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors',
        activeTab === 'stock_items'
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
      onClick={() => setActiveTab('stock_items')}
      data-action="tab-stock-items"
    >
      Surowce
    </button>
    <button
      type="button"
      className={cn(
        'px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors',
        activeTab === 'recipes'
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
      onClick={() => setActiveTab('recipes')}
      data-action="tab-recipes"
    >
      Polprodukty
    </button>
  </div>
)}
```

Import `cn` from `@/lib/utils` and `Recipe` from `@/types/recipe` at the top of the file.

**Step 5: Render tab content**

Wrap the existing stock items list in `{(activeTab === 'stock_items' || !showRecipesTab) && (...)}`.

Add a new block for recipes tab:

```tsx
{activeTab === 'recipes' && showRecipesTab && (
  <div className="max-h-[400px] overflow-y-auto space-y-1">
    {/* Selected recipes */}
    {selectedRecipes.length > 0 && (
      <>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1 border-b">
          Wybrane ({selectedRecipes.length})
        </div>
        {selectedRecipes.map((recipe) => {
          const fieldIndex = (watchedIngredients || []).findIndex(
            (ing) => ing.type === 'recipe' && ing.reference_id === recipe.id
          );
          if (fieldIndex < 0) return null;
          return (
            <div key={recipe.id} className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50" data-ingredient-id={recipe.id}>
              <Checkbox checked={true} onCheckedChange={() => handleToggleRecipe(recipe, false)} />
              <span className="text-sm font-medium min-w-[120px] truncate">{recipe.name}</span>
              <Badge variant="outline" className="text-[10px]">polprodukt</Badge>
              <div className="flex items-center gap-2 ml-auto">
                <DecimalInput
                  className="w-20 h-8 text-sm"
                  value={watchedIngredients[fieldIndex]?.quantity ?? 0}
                  onChange={(val) => form.setValue(`ingredients.${fieldIndex}.quantity`, val)}
                />
                <span className="text-xs text-muted-foreground w-12">{recipe.yield_unit}</span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleToggleRecipe(recipe, false)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </>
    )}
    {/* Available recipes */}
    {availableRecipes.length > 0 && (
      <>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1 border-b mt-2">
          Dostepne
        </div>
        {availableRecipes.map((recipe) => (
          <div key={recipe.id} className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50 cursor-pointer" onClick={() => handleToggleRecipe(recipe, true)}>
            <Checkbox checked={false} onCheckedChange={() => handleToggleRecipe(recipe, true)} />
            <span className="text-sm min-w-[120px] truncate">{recipe.name}</span>
            <Badge variant="outline" className="text-[10px]">polprodukt</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {recipe.cost_per_unit.toFixed(2)} PLN/{recipe.yield_unit}
            </span>
          </div>
        ))}
      </>
    )}
    {availableRecipes.length === 0 && selectedRecipes.length === 0 && (
      <div className="text-sm text-muted-foreground text-center py-4">
        Brak dostepnych polproduktow
      </div>
    )}
  </div>
)}
```

**Step 6: Update RecipeForm component**

In `RecipeForm`, load semi-finished recipes:

```typescript
import { recipesRepository } from '../repository';
import { Recipe } from '@/types/recipe';

// Inside RecipeForm:
const [semiFinishedRecipes, setSemiFinishedRecipes] = useState<Recipe[]>([]);

// In the useEffect that loads stockItems:
useEffect(() => {
  inventoryRepository.getAllStockItems().then(setStockItems);
  recipesRepository.getRecipesByCategory(ProductCategory.SEMI_FINISHED).then(setSemiFinishedRecipes);
}, []);
```

Watch the product_category field to pass to IngredientChecklist:
```typescript
const watchedCategory = form.watch('product_category') as ProductCategory;
```

Update `estimatedCost` calculation to handle recipe-type ingredients:
```typescript
const estimatedCost = (watchedIngredients || []).reduce(
  (sum: number, ing: RecipeIngredientField) => {
    if (ing.type === 'recipe') {
      const subRecipe = semiFinishedRecipes.find((r) => r.id === ing.reference_id);
      if (!subRecipe || !ing.quantity) return sum;
      return sum + ing.quantity * subRecipe.cost_per_unit;
    }
    const stockItem = stockItems.find((s) => s.id === ing.reference_id);
    if (!stockItem || !ing.quantity) return sum;
    return sum + ing.quantity * stockItem.cost_per_unit;
  },
  0
);
```

Update `handleFormSubmit` filter:
```typescript
data.ingredients = data.ingredients.filter(
  (ing) => ing.reference_id && ing.quantity > 0
);
```

Update `handleSaveIngredients` in IngredientChecklist:
```typescript
const ingredients = (watchedIngredients || [])
  .filter((ing) => ing.reference_id && ing.quantity > 0)
  .map((ing) => ({
    type: ing.type,
    reference_id: ing.reference_id,
    reference_name: ing.reference_name,
    quantity: ing.quantity,
    unit: ing.unit,
  }));
```

Pass new props to `<IngredientChecklist>`:
```tsx
<IngredientChecklist
  stockItems={stockItems}
  semiFinishedRecipes={semiFinishedRecipes}
  productCategory={watchedCategory}
  form={form}
  append={append}
  ...
/>
```

Update `onSaveIngredients` prop type on `RecipeFormProps`:
```typescript
onSaveIngredients?: (ingredients: { type: 'stock_item' | 'recipe'; reference_id: string; reference_name?: string; quantity: number; unit: string }[]) => Promise<void>;
```

Update `ProductSearchDialog` `onSelect` handler to use `reference_id`:
```tsx
onSelect={(stockItem) => {
  append({ type: 'stock_item', reference_id: stockItem.id, reference_name: stockItem.name, quantity: 1, unit: stockItem.unit });
}}
```

**Step 7: Commit**

```bash
git add apps/pos/src/modules/recipes/components/recipe-form.tsx
git commit -m "feat(recipes): add Polprodukty tab to ingredient checklist"
```

---

### Task 9: Update seed data

**Files:**
- Modify: `apps/pos/src/seed/data/recipes.ts`

**Step 1: Add type and reference_id to all ingredients**

For every ingredient object across all 14 recipes, change:
- `stock_item_id: STOCK_ITEM_IDS.XXX` → `type: 'stock_item' as const, reference_id: STOCK_ITEM_IDS.XXX`

This is a mechanical find-and-replace.

**Step 2: Make Cheeseburger use Beef Patty as sub-recipe**

Replace the Cheeseburger's beef ingredient (lines 91-96):

```typescript
{
  id: crypto.randomUUID(),
  type: 'recipe',
  reference_id: RECIPE_IDS.BEEF_PATTY,
  reference_name: 'Patty wolowy',
  quantity: 1,
  unit: 'szt',
  notes: 'Patty wolowy z receptury',
},
```

Remove the raw beef line and adjust total_cost accordingly (sub-recipe cost is 4.80 PLN/szt).

**Step 3: Verify seed file compiles**

Run: `cd apps/pos && npx tsc --noEmit 2>&1 | grep recipes`

**Step 4: Commit**

```bash
git add apps/pos/src/seed/data/recipes.ts
git commit -m "refactor(seeds): migrate recipe ingredients to type+reference_id format"
```

---

### Task 10: Fix remaining stock_item_id references

**Files:**
- Various files that still reference `stock_item_id` in recipe context

**Step 1: Search for remaining references**

Run: `cd apps/pos && grep -rn 'stock_item_id' src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.test.'`

Fix each occurrence:
- `src/types/recipe.ts:90` — `IngredientUsageLog.ingredients_used` still uses `stock_item_id` for production logging. This is OK to keep as-is since usage logs track actual stock consumption (always stock items, never sub-recipes). But if the type check complains, update it to match.
- `src/schemas/inventory.ts` — inventory schemas are unrelated; leave as-is.
- `src/schemas/delivery.ts` — delivery schemas; leave as-is.
- `src/modules/deliveries/*` — delivery module; leave as-is.
- `src/seed/data/inventory.ts` — inventory seeds; leave as-is.
- `src/seed/data/products.ts` — product seeds; leave as-is if it refers to menu.RecipeIngredient.

For `src/seed/data/products.ts`, update any inline `RecipeIngredient` objects to use `type: 'stock_item'` and `reference_id` instead of `stock_item_id`, matching the updated `menu.ts` type.

**Step 2: Run full type check**

Run: `cd apps/pos && npx tsc --noEmit`
Expected: Clean

**Step 3: Commit**

```bash
git add -A
git commit -m "fix(recipes): resolve all remaining stock_item_id references"
```

---

### Task 11: Write unit tests for nested recipe cost and allergen logic

**Files:**
- Create: `apps/pos/src/modules/recipes/__tests__/nested-recipes.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock inventory repository
vi.mock('@/modules/inventory/repository', () => ({
  inventoryRepository: {
    getAllStockItems: vi.fn(),
  },
}));

// Mock repository-factory
vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: () => ({
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }),
}));

import { inventoryRepository } from '@/modules/inventory/repository';
import { recipesRepository } from '../repository';
import { Allergen, ProductCategory } from '@/types/enums';
import { Recipe } from '@/types/recipe';

const mockStockItems = [
  { id: 'stock-beef', name: 'Wolowina', unit: 'g', cost_per_unit: 0.032, allergens: [], product_category: ProductCategory.RAW_MATERIAL },
  { id: 'stock-buns', name: 'Bulki', unit: 'szt', cost_per_unit: 1.20, allergens: [Allergen.GLUTEN, Allergen.EGGS], product_category: ProductCategory.RAW_MATERIAL },
  { id: 'stock-cheddar', name: 'Ser cheddar', unit: 'g', cost_per_unit: 0.028, allergens: [Allergen.MILK], product_category: ProductCategory.RAW_MATERIAL },
];

const semiFinishedRecipe: Recipe = {
  id: 'recipe-patty',
  product_id: 'product-patty',
  name: 'Patty wolowy',
  description: null,
  product_category: ProductCategory.SEMI_FINISHED,
  ingredients: [
    { type: 'stock_item', reference_id: 'stock-beef', quantity: 150, unit: 'g' },
  ],
  yield_quantity: 1,
  yield_unit: 'szt',
  preparation_time_minutes: 5,
  instructions: null,
  allergens: [],
  total_cost: 4.80,
  cost_per_unit: 4.80,
  food_cost_percentage: null,
  version: 1,
  is_active: true,
  created_by: 'system',
  last_updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const finishedRecipe: Recipe = {
  id: 'recipe-burger',
  product_id: 'product-burger',
  name: 'Cheeseburger',
  description: null,
  product_category: ProductCategory.FINISHED_GOOD,
  ingredients: [
    { type: 'stock_item', reference_id: 'stock-buns', quantity: 1, unit: 'szt' },
    { type: 'recipe', reference_id: 'recipe-patty', quantity: 1, unit: 'szt' },
    { type: 'stock_item', reference_id: 'stock-cheddar', quantity: 40, unit: 'g' },
  ],
  yield_quantity: 1,
  yield_unit: 'szt',
  preparation_time_minutes: 12,
  instructions: null,
  allergens: [],
  total_cost: 0,
  cost_per_unit: 0,
  food_cost_percentage: null,
  version: 1,
  is_active: true,
  created_by: 'system',
  last_updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Nested Recipe Cost Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryRepository.getAllStockItems as ReturnType<typeof vi.fn>).mockResolvedValue(mockStockItems);
  });

  it('calculates cost for recipe with sub-recipe ingredient', async () => {
    // Mock findById to return the sub-recipe
    recipesRepository.recipes.findById = vi.fn().mockImplementation((id: string) => {
      if (id === 'recipe-patty') return Promise.resolve(semiFinishedRecipe);
      return Promise.resolve(null);
    });

    const breakdown = await recipesRepository.calculateRecipeCost(finishedRecipe);

    // buns: 1 * 1.20 = 1.20
    // patty sub-recipe: 1 * 4.80 = 4.80
    // cheddar: 40 * 0.028 = 1.12
    // total = 7.12
    expect(breakdown.total_cost).toBeCloseTo(7.12, 2);
    expect(breakdown.cost_per_unit).toBeCloseTo(7.12, 2);
    expect(breakdown.ingredients).toHaveLength(3);

    const pattyLine = breakdown.ingredients.find((i) => i.type === 'recipe');
    expect(pattyLine).toBeDefined();
    expect(pattyLine!.reference_name).toBe('Patty wolowy');
    expect(pattyLine!.cost_per_unit).toBe(4.80);
  });

  it('calculates cost for stock-item-only recipe (no nesting)', async () => {
    const breakdown = await recipesRepository.calculateRecipeCost({
      ...semiFinishedRecipe,
      ingredients: [
        { type: 'stock_item', reference_id: 'stock-beef', quantity: 150, unit: 'g' },
      ],
    });

    // 150 * 0.032 = 4.80
    expect(breakdown.total_cost).toBeCloseTo(4.80, 2);
  });

  it('throws when sub-recipe not found', async () => {
    recipesRepository.recipes.findById = vi.fn().mockResolvedValue(null);

    await expect(
      recipesRepository.calculateRecipeCost(finishedRecipe)
    ).rejects.toThrow('Sub-recipe not found: recipe-patty');
  });
});

describe('Nested Recipe Allergen Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryRepository.getAllStockItems as ReturnType<typeof vi.fn>).mockResolvedValue(mockStockItems);
  });

  it('collects allergens from both stock items and sub-recipes', async () => {
    const pattyWithAllergens = { ...semiFinishedRecipe, allergens: [Allergen.SULPHITES] };
    recipesRepository.recipes.findById = vi.fn().mockImplementation((id: string) => {
      if (id === 'recipe-patty') return Promise.resolve(pattyWithAllergens);
      return Promise.resolve(null);
    });

    const allergens = await recipesRepository.getAllergensInRecipe(finishedRecipe);

    // buns → GLUTEN, EGGS
    // patty sub-recipe → SULPHITES
    // cheddar → MILK
    expect(allergens).toContain(Allergen.GLUTEN);
    expect(allergens).toContain(Allergen.EGGS);
    expect(allergens).toContain(Allergen.MILK);
    expect(allergens).toContain(Allergen.SULPHITES);
    expect(allergens).toHaveLength(4);
  });

  it('deduplicates allergens', async () => {
    // Patty also has GLUTEN → should not appear twice
    const pattyWithGluten = { ...semiFinishedRecipe, allergens: [Allergen.GLUTEN] };
    recipesRepository.recipes.findById = vi.fn().mockResolvedValue(pattyWithGluten);

    const allergens = await recipesRepository.getAllergensInRecipe(finishedRecipe);
    const glutenCount = allergens.filter((a) => a === Allergen.GLUTEN).length;
    expect(glutenCount).toBe(1);
  });
});

describe('findRecipesUsingSubRecipe', () => {
  it('finds parent recipes that reference a sub-recipe', async () => {
    recipesRepository.recipes.findMany = vi.fn().mockImplementation((predicate: (r: Recipe) => boolean) => {
      return Promise.resolve([finishedRecipe].filter(predicate));
    });

    const parents = await recipesRepository.findRecipesUsingSubRecipe('recipe-patty');
    expect(parents).toHaveLength(1);
    expect(parents[0].id).toBe('recipe-burger');
  });

  it('returns empty array when no parents found', async () => {
    recipesRepository.recipes.findMany = vi.fn().mockResolvedValue([]);
    const parents = await recipesRepository.findRecipesUsingSubRecipe('recipe-nonexistent');
    expect(parents).toHaveLength(0);
  });
});
```

**Step 2: Run tests**

Run: `cd apps/pos && npx vitest run src/modules/recipes/__tests__/nested-recipes.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add apps/pos/src/modules/recipes/__tests__/nested-recipes.test.ts
git commit -m "test(recipes): add unit tests for nested BOM cost and allergen logic"
```

---

### Task 12: Update existing recipe-form test

**Files:**
- Modify: `apps/pos/src/modules/recipes/components/__tests__/recipe-form.test.tsx`

**Step 1: Update test to use new field names**

- Line 104: Change `submittedData.ingredients[0].stock_item_id` → `submittedData.ingredients[0].reference_id`
- Add mock for `recipesRepository.getRecipesByCategory` (returns empty array)

Add mock:
```typescript
vi.mock('@/modules/recipes/repository', () => ({
  recipesRepository: {
    getRecipesByCategory: vi.fn().mockResolvedValue([]),
  },
}));
```

**Step 2: Run test**

Run: `cd apps/pos && npx vitest run src/modules/recipes/components/__tests__/recipe-form.test.tsx`
Expected: Pass

**Step 3: Commit**

```bash
git add apps/pos/src/modules/recipes/components/__tests__/recipe-form.test.tsx
git commit -m "test(recipes): update recipe-form test for reference_id fields"
```

---

### Task 13: Build verification and final check

**Step 1: Run full type check**

Run: `cd apps/pos && npx tsc --noEmit`
Expected: Clean — no errors

**Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Run lint**

Run: `pnpm lint`
Expected: No new errors (existing warnings OK)

**Step 5: Commit any remaining fixes**

If any issues found in steps 1-4, fix and commit.

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(recipes): nested BOM — recipes can contain sub-recipes as ingredients"
```
