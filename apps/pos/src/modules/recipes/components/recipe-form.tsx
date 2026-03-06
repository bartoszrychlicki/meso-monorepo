/**
 * Recipe Form Component
 *
 * Form for creating and editing recipes with ingredient management.
 * Supports nested recipes (polprodukty) as ingredients for finished goods.
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRecipeSchema, CreateRecipeInput } from '@/schemas/recipe';
import { ProductCategory } from '@/types/enums';
import { Recipe, RecipeProductCategory, RECIPE_PRODUCT_CATEGORIES } from '@/types/recipe';
import { StockItem, Warehouse } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
import { StockItemForm } from '@/modules/inventory/components/stock-item-form';
import { recipesRepository } from '../repository';
import { getCategoryDisplayName } from '../utils/recipe-calculator';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trash2, Save, X, Search, DollarSign, HelpCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DecimalInput } from '@/components/ui/decimal-input';
import { convertQuantity } from '@/lib/utils/unit-conversion';

interface RecipeIngredientField {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name?: string;
  quantity: number;
  unit: string;
}

function normalizeRecipeIngredients(rawIngredients: unknown): RecipeIngredientField[] {
  if (!Array.isArray(rawIngredients)) return [];

  const normalized: RecipeIngredientField[] = [];

  for (const raw of rawIngredients) {
    if (!raw || typeof raw !== 'object') continue;

    const ingredient = raw as Record<string, unknown>;

    const type =
      ingredient.type === 'stock_item' || ingredient.type === 'recipe'
        ? ingredient.type
        : typeof ingredient.stock_item_id === 'string'
          ? 'stock_item'
          : typeof ingredient.recipe_id === 'string' ||
              typeof ingredient.semi_finished_id === 'string'
            ? 'recipe'
            : null;

    const referenceId =
      typeof ingredient.reference_id === 'string'
        ? ingredient.reference_id
        : typeof ingredient.stock_item_id === 'string'
          ? ingredient.stock_item_id
          : typeof ingredient.recipe_id === 'string'
            ? ingredient.recipe_id
            : typeof ingredient.semi_finished_id === 'string'
              ? ingredient.semi_finished_id
              : '';

    const parsedQuantity =
      typeof ingredient.quantity === 'number'
        ? ingredient.quantity
        : Number(ingredient.quantity);

    const unit =
      typeof ingredient.unit === 'string' && ingredient.unit.trim().length > 0
        ? ingredient.unit
        : 'szt';

    const referenceName =
      typeof ingredient.reference_name === 'string'
        ? ingredient.reference_name
        : typeof ingredient.stock_item_name === 'string'
          ? ingredient.stock_item_name
          : typeof ingredient.recipe_name === 'string'
            ? ingredient.recipe_name
            : undefined;

    if (!type || !referenceId) continue;
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) continue;

    normalized.push({
      type,
      reference_id: referenceId,
      reference_name: referenceName,
      quantity: parsedQuantity,
      unit,
    });
  }

  return normalized;
}

interface IngredientChecklistProps {
  blockedRecipeIds: Set<string>;
  stockItems: StockItem[];
  semiFinishedRecipes: Recipe[];
  productCategory: RecipeProductCategory;
  form: {
    setValue: (
      name: string,
      value: unknown,
      options?: { shouldDirty?: boolean; shouldValidate?: boolean }
    ) => void;
  };
  append: (value: RecipeIngredientField) => void;
  remove: (index: number) => void;
  ingredientSearch: string;
  setIngredientSearch: (value: string) => void;
  estimatedCost: number;
  onSaveIngredients?: (ingredients: RecipeIngredientField[]) => Promise<void>;
  isSavingIngredients: boolean;
  setIsSavingIngredients: (value: boolean) => void;
  watchedIngredients: RecipeIngredientField[];
  onAddStockItem?: () => void;
  canAddStockItem: boolean;
}

function IngredientChecklist({
  blockedRecipeIds,
  stockItems,
  semiFinishedRecipes,
  productCategory,
  form,
  append,
  remove,
  ingredientSearch,
  setIngredientSearch,
  estimatedCost,
  onSaveIngredients,
  isSavingIngredients,
  setIsSavingIngredients,
  watchedIngredients,
  onAddStockItem,
  canAddStockItem,
}: IngredientChecklistProps) {
  const [activeTab, setActiveTab] = useState<'stock_items' | 'recipes'>('stock_items');
  const showRecipesTab = true;

  const selectedIds = useMemo(() => {
    return new Set(
      (watchedIngredients || [])
        .map((ing) => `${ing.type}:${ing.reference_id}`)
        .filter(Boolean)
    );
  }, [watchedIngredients]);

  const searchLower = ingredientSearch.toLowerCase();

  // Stock item filtering
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

  const filteredSelectedStockItems = selectedStockItems.filter(
    (s) => !searchLower || s.name.toLowerCase().includes(searchLower)
  );

  // Recipe filtering
  const selectedRecipes = semiFinishedRecipes.filter((r) => selectedRecipeIds.has(r.id));
  const availableRecipes = semiFinishedRecipes
    .filter((r) => !blockedRecipeIds.has(r.id))
    .filter((r) => !selectedRecipeIds.has(r.id))
    .filter((r) => !searchLower || r.name.toLowerCase().includes(searchLower));

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

  const handleSaveIngredients = async () => {
    if (!onSaveIngredients) return;
    setIsSavingIngredients(true);
    try {
      const ingredients = (watchedIngredients || [])
        .filter((ing) => ing.reference_id && ing.quantity > 0)
        .map((ing) => ({
          type: ing.type,
          reference_id: ing.reference_id,
          reference_name: ing.reference_name,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
      await onSaveIngredients(ingredients);
    } finally {
      setIsSavingIngredients(false);
    }
  };

  const formatCostPerUnit = (item: StockItem) => {
    return `${item.cost_per_unit.toFixed(3)} PLN/${item.unit}`;
  };

  return (
    <Card data-component="ingredient-checklist">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Skladniki (BOM)
            {selectedIds.size > 0 && (
              <Badge variant="secondary" data-value={`selected-${selectedIds.size}`}>
                {selectedIds.size}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {onAddStockItem && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddStockItem}
                disabled={!canAddStockItem}
                data-action="add-stock-item-from-recipe"
              >
                <Plus className="mr-1 h-4 w-4" />
                Dodaj produkt
              </Button>
            )}
            {onSaveIngredients && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveIngredients}
                disabled={isSavingIngredients}
                data-action="save-ingredients"
              >
                <Save className="mr-1 h-4 w-4" />
                {isSavingIngredients ? 'Zapisywanie...' : 'Zapisz skladniki'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Estimated Cost - always visible at top */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Szacowany koszt:</span>
          <span className="text-sm font-bold" data-field="estimated-cost">
            {estimatedCost.toFixed(2)} zl
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj skladnika..."
            value={ingredientSearch}
            onChange={(e) => setIngredientSearch(e.target.value)}
            className="pl-9"
            data-field="ingredient-search"
          />
        </div>

        {/* Tab buttons */}
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

        {/* Stock items tab */}
        {(activeTab === 'stock_items' || !showRecipesTab) && (
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {/* Selected items */}
            {filteredSelectedStockItems.length > 0 && (
              <>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1 border-b">
                  Wybrane ({selectedStockIds.size})
                </div>
                {filteredSelectedStockItems.map((stockItem) => {
                  const fieldIndex = (watchedIngredients || []).findIndex(
                    (ing) => ing.type === 'stock_item' && ing.reference_id === stockItem.id
                  );
                  if (fieldIndex < 0) return null;
                  return (
                    <div
                      key={stockItem.id}
                      className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50"
                      data-ingredient-id={stockItem.id}
                    >
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => handleToggleStockItem(stockItem, false)}
                        data-action={`toggle-ingredient-${stockItem.id}`}
                        aria-label={`Odznacz ${stockItem.name}`}
                      />
                      <span className="text-sm font-medium min-w-[120px] truncate">
                        {stockItem.name}
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <DecimalInput
                          className="w-20 h-8 text-sm"
                          value={watchedIngredients[fieldIndex]?.quantity ?? 0}
                          onChange={(val) =>
                            form.setValue(
                              `ingredients.${fieldIndex}.quantity`,
                              val
                            )
                          }
                          data-field={`quantity-${stockItem.id}`}
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {stockItem.unit}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleToggleStockItem(stockItem, false)}
                          data-action={`remove-ingredient-${stockItem.id}`}
                          aria-label={`Usun ${stockItem.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Available items */}
            {availableStockItems.length > 0 && (
              <>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1 border-b mt-2">
                  Dostepne
                </div>
                {availableStockItems.map((stockItem) => (
                  <div
                    key={stockItem.id}
                    className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50 cursor-pointer"
                    data-stock-item-id={stockItem.id}
                    onClick={() => handleToggleStockItem(stockItem, true)}
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleToggleStockItem(stockItem, true)}
                      data-action={`toggle-ingredient-${stockItem.id}`}
                      aria-label={`Zaznacz ${stockItem.name}`}
                    />
                    <span className="text-sm min-w-[120px] truncate">
                      {stockItem.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatCostPerUnit(stockItem)}
                    </span>
                  </div>
                ))}
              </>
            )}

            {availableStockItems.length === 0 && filteredSelectedStockItems.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                {ingredientSearch
                  ? 'Brak skladnikow pasujacych do wyszukiwania'
                  : 'Brak dostepnych skladnikow'}
              </div>
            )}
          </div>
        )}

        {/* Recipes tab */}
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

      </CardContent>
    </Card>
  );
}

interface RecipeFormProps {
  defaultValues?: Partial<CreateRecipeInput>;
  recipeId?: string;
  onSubmit: (data: CreateRecipeInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  onSaveIngredients?: (ingredients: RecipeIngredientField[]) => Promise<void>;
}

export function RecipeForm({
  defaultValues,
  recipeId,
  onSubmit,
  onCancel,
  isLoading = false,
  onSaveIngredients,
}: RecipeFormProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [semiFinishedRecipes, setSemiFinishedRecipes] = useState<Recipe[]>([]);
  const [blockedRecipeIds, setBlockedRecipeIds] = useState<Set<string>>(new Set());
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);
  const [showStockItemForm, setShowStockItemForm] = useState(false);

  const normalizedDefaultIngredients = useMemo(
    () => normalizeRecipeIngredients(defaultValues?.ingredients),
    [defaultValues?.ingredients]
  );

  const loadStockItems = useCallback(async () => {
    const items = await inventoryRepository.getAllStockItems();
    setStockItems(items);
  }, []);

  const loadSemiFinishedRecipes = useCallback(async () => {
    const [recipes, blockedIds] = await Promise.all([
      recipesRepository.getRecipesByCategory(ProductCategory.SEMI_FINISHED),
      recipeId
        ? recipesRepository.getBlockedSubRecipeIds(recipeId)
        : Promise.resolve([]),
    ]);
    setSemiFinishedRecipes(recipes);
    setBlockedRecipeIds(new Set(blockedIds));
  }, [recipeId]);

  const loadWarehouses = useCallback(async () => {
    const warehouseList = await inventoryRepository.getAllWarehouses();
    setWarehouses(warehouseList);
  }, []);

  useEffect(() => {
    void Promise.all([
      loadStockItems(),
      loadSemiFinishedRecipes(),
      loadWarehouses(),
    ]);
  }, [loadStockItems, loadSemiFinishedRecipes, loadWarehouses]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<Record<string, any>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateRecipeSchema) as any,
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      product_id: defaultValues?.product_id || crypto.randomUUID(),
      product_category:
        defaultValues?.product_category || ProductCategory.FINISHED_GOOD,
      ingredients: normalizedDefaultIngredients,
      yield_quantity: defaultValues?.yield_quantity || 1,
      yield_unit:
        defaultValues?.yield_unit ||
        (defaultValues?.product_category === ProductCategory.SEMI_FINISHED
          ? 'kg'
          : 'szt'),
      preparation_time_minutes:
        defaultValues?.preparation_time_minutes || 10,
      instructions: defaultValues?.instructions || '',
      created_by:
        defaultValues?.created_by || crypto.randomUUID(),
    },
  });

  const { fields: _fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  // Sync yield_unit with product_category
  const watchedCategory = form.watch('product_category');
  const watchedYieldUnit = form.watch('yield_unit');
  useEffect(() => {
    if (watchedCategory === ProductCategory.FINISHED_GOOD) {
      if (form.getValues('yield_unit') !== 'szt') {
        form.setValue('yield_unit', 'szt');
      }
      return;
    }

    if (!['kg', 'szt'].includes(form.getValues('yield_unit'))) {
      form.setValue('yield_unit', 'kg');
    }
  }, [watchedCategory, form]);

  // --- Draft auto-save (sessionStorage) ---
  const DRAFT_KEY = 'mesopos_recipe_draft';
  const draftRestored = useRef(false);

  // Restore draft on mount (only for new recipes, not edits)
  useEffect(() => {
    if (draftRestored.current || defaultValues?.name) return;
    draftRestored.current = true;
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as Record<string, unknown>;
        form.reset({
          ...form.getValues(),
          ...draft,
          ingredients: normalizeRecipeIngredients(draft.ingredients),
        });
      }
    } catch {
      // ignore parse errors
    }
  }, [defaultValues?.name, form]);

  // Debounced save on form change
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveDraft = useCallback((values: Record<string, unknown>) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
      } catch {
        // storage full or unavailable
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (defaultValues?.name) return; // Don't auto-save when editing existing recipe
    const subscription = form.watch((values) => {
      saveDraft(values as Record<string, unknown>);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDraft, defaultValues?.name]);

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    const data = formData as unknown as CreateRecipeInput;
    // Filter out empty ingredients
    data.ingredients = data.ingredients.filter(
      (ing) => ing.reference_id && ing.quantity > 0
    );
    await onSubmit(data);
    // Clear draft on successful submit
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const handleInvalid = (errors: Record<string, { message?: string } | undefined>) => {
    const messages: string[] = [];
    if (errors.name) messages.push(`Nazwa: ${errors.name.message}`);
    if (errors.ingredients) {
      const ingredientsError = errors.ingredients as Record<string, unknown>;
      const message =
        typeof ingredientsError.message === 'string'
          ? ingredientsError.message
          : 'Co najmniej jeden skladnik ma niepoprawny format. Usun go i dodaj ponownie.';
      messages.push(`Skladniki: ${message}`);
    }
    if (errors.product_category) messages.push(`Kategoria: ${errors.product_category.message}`);
    if (errors.product_id) messages.push(`Produkt: ${errors.product_id.message}`);
    if (errors.created_by) messages.push(`Uzytkownik: ${errors.created_by.message}`);
    if (messages.length === 0) messages.push('Formularz zawiera bledy walidacji');
    toast.error(messages.join('. '));
  };

  const handleCreateStockItem = useCallback(
    async (
      data: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>,
      warehouseId: string,
      quantity: number,
      minQuantity: number
    ) => {
      const createdItem = await inventoryRepository.stockItems.create(data);
      await inventoryRepository.assignToWarehouse(
        warehouseId,
        createdItem.id,
        quantity,
        minQuantity
      );
      await loadStockItems();
    },
    [loadStockItems]
  );

  // Calculate estimated cost
  const watchedIngredients = form.watch('ingredients');
  const estimatedCost = (watchedIngredients || []).reduce(
    (sum: number, ing: RecipeIngredientField) => {
      if (ing.type === 'recipe') {
        const subRecipe = semiFinishedRecipes.find((r) => r.id === ing.reference_id);
        if (!subRecipe || !ing.quantity) return sum;
        const normalizedQuantity = convertQuantity(
          ing.quantity,
          ing.unit,
          subRecipe.yield_unit
        );
        if (normalizedQuantity == null) return sum;
        return sum + normalizedQuantity * subRecipe.cost_per_unit;
      }
      const stockItem = stockItems.find((s) => s.id === ing.reference_id);
      if (!stockItem || !ing.quantity) return sum;
      const normalizedQuantity = convertQuantity(
        ing.quantity,
        ing.unit,
        stockItem.unit
      );
      if (normalizedQuantity == null) return sum;
      return sum + normalizedQuantity * stockItem.cost_per_unit;
    },
    0
  );

  return (
    <TooltipProvider>
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit, handleInvalid)}
        className="space-y-4"
        data-component="recipe-form"
      >
        {/* Row 1: Name + Category + Yield + Prep Time — all in one line */}
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Nazwa *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="np. Cheeseburger Classic"
                    data-field="recipe-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Opis</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Opis receptury (opcjonalny)"
                    data-field="recipe-description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Kategoria *
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Typ produktu: danie gotowe, polprodukt lub skladnik
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-[150px]" data-field="product-category">
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RECIPE_PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel className="flex items-center gap-1">
              Wydajnosc *
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                    <TooltipContent side="top">
                      Wydajnosc receptury: produkty finalne sa w sztukach, polprodukty moga byc w sztukach lub kilogramach
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <div className="flex items-center gap-1.5">
                  <FormField
                    control={form.control}
                    name="yield_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DecimalInput
                            className="w-[80px]"
                            data-field="yield-quantity"
                            value={field.value ?? null}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedCategory === ProductCategory.SEMI_FINISHED ? (
                    <FormField
                      control={form.control}
                      name="yield_unit"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]" data-field="yield-unit">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="szt">szt</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground" data-field="yield-unit">
                      {watchedYieldUnit || 'szt'}
                    </span>
                  )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="preparation_time_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Czas (min) *
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Szacowany czas przygotowania dania w minutach
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
                    className="w-[80px]"
                    data-field="prep-time"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ingredients Checklist */}
        <IngredientChecklist
          blockedRecipeIds={blockedRecipeIds}
          stockItems={stockItems}
          semiFinishedRecipes={semiFinishedRecipes}
          productCategory={watchedCategory}
          form={form}
          append={append}
          remove={remove}
          ingredientSearch={ingredientSearch}
          setIngredientSearch={setIngredientSearch}
          estimatedCost={estimatedCost}
          onSaveIngredients={onSaveIngredients}
          isSavingIngredients={isSavingIngredients}
          setIsSavingIngredients={setIsSavingIngredients}
          watchedIngredients={watchedIngredients}
          onAddStockItem={() => setShowStockItemForm(true)}
          canAddStockItem={warehouses.length > 0}
        />
        {form.formState.errors.ingredients && (
          <p className="text-sm text-destructive font-medium" data-status="error">
            {String(
              (form.formState.errors.ingredients as Record<string, unknown>)?.message ??
                'Co najmniej jeden skladnik ma niepoprawny format. Usun go i dodaj ponownie.'
            )}
          </p>
        )}

        {/* Instructions */}
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instrukcje przygotowania</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="1. Przygotuj skladniki&#10;2. ..."
                  rows={3}
                  data-field="instructions"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-action="cancel"
            >
              <X className="mr-2 h-4 w-4" />
              Anuluj
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            data-action="save-recipe"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Zapisywanie...' : 'Zapisz recepture'}
          </Button>
        </div>
      </form>
    </Form>
    <StockItemForm
      open={showStockItemForm}
      onOpenChange={setShowStockItemForm}
      warehouses={warehouses}
      onSubmit={handleCreateStockItem}
    />
    </TooltipProvider>
  );
}
