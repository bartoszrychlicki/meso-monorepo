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
import { Recipe } from '@/types/recipe';
import { StockItem } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
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
import { Trash2, Save, X, Search, DollarSign, HelpCircle, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { DecimalInput } from '@/components/ui/decimal-input';
import { ProductSearchDialog } from './product-search-dialog';

interface RecipeIngredientField {
  type: 'stock_item' | 'recipe';
  reference_id: string;
  reference_name?: string;
  quantity: number;
  unit: string;
}

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

function IngredientChecklist({
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
}: IngredientChecklistProps) {
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock_items' | 'recipes'>('stock_items');
  const showRecipesTab = productCategory === ProductCategory.FINISHED_GOOD;

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProductSearchOpen(true)}
              data-action="add-from-list"
            >
              <ListPlus className="mr-1 h-4 w-4" />
              Dodaj z listy
            </Button>
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

        <ProductSearchDialog
          open={productSearchOpen}
          onOpenChange={setProductSearchOpen}
          stockItems={stockItems}
          excludeIds={Array.from(selectedStockIds)}
          onSelect={(stockItem) => {
            append({ type: 'stock_item', reference_id: stockItem.id, reference_name: stockItem.name, quantity: 1, unit: stockItem.unit });
          }}
        />
      </CardContent>
    </Card>
  );
}

interface RecipeFormProps {
  defaultValues?: Partial<CreateRecipeInput>;
  onSubmit: (data: CreateRecipeInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  onSaveIngredients?: (ingredients: RecipeIngredientField[]) => Promise<void>;
}

export function RecipeForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  onSaveIngredients,
}: RecipeFormProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [semiFinishedRecipes, setSemiFinishedRecipes] = useState<Recipe[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  useEffect(() => {
    inventoryRepository.getAllStockItems().then(setStockItems);
    recipesRepository.getRecipesByCategory(ProductCategory.SEMI_FINISHED).then(setSemiFinishedRecipes);
  }, []);

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
      ingredients: defaultValues?.ingredients || [],
      yield_quantity: defaultValues?.yield_quantity || 1,
      yield_unit: defaultValues?.yield_unit || 'szt',
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
        const draft = JSON.parse(saved);
        form.reset({ ...form.getValues(), ...draft });
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
    if (errors.ingredients) messages.push(`Skladniki: ${errors.ingredients.message || 'Dodaj co najmniej 1 skladnik'}`);
    if (errors.product_category) messages.push(`Kategoria: ${errors.product_category.message}`);
    if (messages.length === 0) messages.push('Formularz zawiera bledy walidacji');
    toast.error(messages.join('. '));
  };

  // Calculate estimated cost
  const watchedIngredients = form.watch('ingredients');
  const watchedCategory = form.watch('product_category') as ProductCategory;
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
                    {Object.values(ProductCategory).map((category) => (
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
                  Ile porcji/sztuk powstaje z tej receptury
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
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="w-[70px]"
                        data-field="yield-quantity"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yield_unit"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[90px]" data-field="yield-unit">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="szt">szt</SelectItem>
                        <SelectItem value="porcja">porcja</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="l">l</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

        {/* Row 2: Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
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

        {/* Ingredients Checklist */}
        <IngredientChecklist
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
        />
        {form.formState.errors.ingredients && (
          <p className="text-sm text-destructive font-medium" data-status="error">
            {String((form.formState.errors.ingredients as Record<string, unknown>)?.message ?? 'Dodaj co najmniej 1 skladnik')}
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
    </TooltipProvider>
  );
}
