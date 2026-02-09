/**
 * Recipe Form Component
 *
 * Form for creating and editing recipes with ingredient management.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRecipeSchema, CreateRecipeInput } from '@/schemas/recipe';
import { ProductCategory } from '@/types/enums';
import { StockItem } from '@/types/inventory';
import { inventoryRepository } from '@/modules/inventory/repository';
import { getCategoryDisplayName } from '../utils/recipe-calculator';
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
import { Trash2, Save, X, Search } from 'lucide-react';

interface IngredientChecklistProps {
  stockItems: StockItem[];
  form: any;
  append: (value: any) => void;
  remove: (index: number) => void;
  ingredientSearch: string;
  setIngredientSearch: (value: string) => void;
  estimatedCost: number;
  onSaveIngredients?: (ingredients: { stock_item_id: string; quantity: number; unit: string }[]) => Promise<void>;
  isSavingIngredients: boolean;
  setIsSavingIngredients: (value: boolean) => void;
  watchedIngredients: any[];
}

function IngredientChecklist({
  stockItems,
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
  const selectedIds = useMemo(() => {
    return new Set(
      (watchedIngredients || [])
        .map((ing: any) => ing.stock_item_id)
        .filter(Boolean)
    );
  }, [watchedIngredients]);

  const searchLower = ingredientSearch.toLowerCase();

  const selectedItems = stockItems.filter((s) => selectedIds.has(s.id));
  const availableItems = stockItems
    .filter((s) => !selectedIds.has(s.id))
    .filter((s) => !searchLower || s.name.toLowerCase().includes(searchLower));

  const filteredSelectedItems = selectedItems.filter(
    (s) => !searchLower || s.name.toLowerCase().includes(searchLower)
  );

  const handleToggle = (stockItem: StockItem, checked: boolean) => {
    if (checked) {
      append({ stock_item_id: stockItem.id, quantity: 1, unit: stockItem.unit });
    } else {
      const idx = (watchedIngredients || []).findIndex(
        (ing: any) => ing.stock_item_id === stockItem.id
      );
      if (idx >= 0) remove(idx);
    }
  };

  const handleSaveIngredients = async () => {
    if (!onSaveIngredients) return;
    setIsSavingIngredients(true);
    try {
      const ingredients = (watchedIngredients || [])
        .filter((ing: any) => ing.stock_item_id && ing.quantity > 0)
        .map((ing: any) => ({
          stock_item_id: ing.stock_item_id,
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {/* Selected items */}
          {filteredSelectedItems.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1 border-b">
                Wybrane ({selectedIds.size})
              </div>
              {filteredSelectedItems.map((stockItem) => {
                const fieldIndex = (watchedIngredients || []).findIndex(
                  (ing: any) => ing.stock_item_id === stockItem.id
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
                      onCheckedChange={() => handleToggle(stockItem, false)}
                      data-action={`toggle-ingredient-${stockItem.id}`}
                      aria-label={`Odznacz ${stockItem.name}`}
                    />
                    <span className="text-sm font-medium min-w-[140px] truncate">
                      {stockItem.name}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-20 h-8 text-sm"
                        value={watchedIngredients[fieldIndex]?.quantity ?? 0}
                        onChange={(e) =>
                          form.setValue(
                            `ingredients.${fieldIndex}.quantity`,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        data-field={`quantity-${stockItem.id}`}
                      />
                      <Select
                        value={watchedIngredients[fieldIndex]?.unit || stockItem.unit}
                        onValueChange={(val) =>
                          form.setValue(`ingredients.${fieldIndex}.unit`, val)
                        }
                      >
                        <SelectTrigger className="w-20 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="szt">szt</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleToggle(stockItem, false)}
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
          {availableItems.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-1 border-b mt-2">
                Dostepne
              </div>
              {availableItems.map((stockItem) => (
                <div
                  key={stockItem.id}
                  className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50 cursor-pointer"
                  data-stock-item-id={stockItem.id}
                  onClick={() => handleToggle(stockItem, true)}
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleToggle(stockItem, true)}
                    data-action={`toggle-ingredient-${stockItem.id}`}
                    aria-label={`Zaznacz ${stockItem.name}`}
                  />
                  <span className="text-sm min-w-[140px] truncate">
                    {stockItem.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatCostPerUnit(stockItem)}
                  </span>
                </div>
              ))}
            </>
          )}

          {availableItems.length === 0 && filteredSelectedItems.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              {ingredientSearch
                ? 'Brak skladnikow pasujacych do wyszukiwania'
                : 'Brak dostepnych skladnikow'}
            </div>
          )}
        </div>

        {/* Estimated Cost + Save button */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-sm">
            {estimatedCost > 0 && (
              <>
                <span className="text-muted-foreground mr-2">Szacowany koszt:</span>
                <span className="font-bold" data-field="estimated-cost">
                  {estimatedCost.toFixed(2)} zl
                </span>
              </>
            )}
          </div>
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
      </CardContent>
    </Card>
  );
}

interface RecipeFormProps {
  defaultValues?: Partial<CreateRecipeInput>;
  onSubmit: (data: CreateRecipeInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  onSaveIngredients?: (ingredients: { stock_item_id: string; quantity: number; unit: string }[]) => Promise<void>;
}

export function RecipeForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  onSaveIngredients,
}: RecipeFormProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  useEffect(() => {
    inventoryRepository.getAllStockItems().then(setStockItems);
  }, []);

  const form = useForm<any>({
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
        defaultValues?.created_by || '11111111-1111-1111-1111-111111111111',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  });

  const handleFormSubmit = async (data: any) => {
    // Filter out empty ingredients
    data.ingredients = data.ingredients.filter(
      (ing: any) => ing.stock_item_id && ing.quantity > 0
    );
    await onSubmit(data as CreateRecipeInput);
  };

  // Calculate estimated cost
  const watchedIngredients = form.watch('ingredients');
  const estimatedCost = (watchedIngredients || []).reduce(
    (sum: number, ing: any) => {
      const stockItem = stockItems.find((s) => s.id === ing.stock_item_id);
      if (!stockItem || !ing.quantity) return sum;
      return sum + ing.quantity * stockItem.cost_per_unit;
    },
    0
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
        data-component="recipe-form"
      >
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa receptury *</FormLabel>
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
                <FormLabel>Kategoria *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-field="product-category">
                      <SelectValue placeholder="Wybierz kategorie" />
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
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opis</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Opcjonalny opis receptury..."
                  rows={2}
                  data-field="recipe-description"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Yield and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="yield_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wydajnosc *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
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
                <FormLabel>Jednostka wydajnosci *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-field="yield-unit">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="szt">szt (sztuki)</SelectItem>
                    <SelectItem value="porcja">porcja</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="l">l (litry)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preparation_time_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Czas przygotowania (min) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="1440"
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
          stockItems={stockItems}
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
                  rows={4}
                  data-field="instructions"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
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
  );
}
