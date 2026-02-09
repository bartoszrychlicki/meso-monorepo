/**
 * Recipe Form Component
 *
 * Form for creating and editing recipes with ingredient management.
 */

'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Trash2, Save, X } from 'lucide-react';

interface RecipeFormProps {
  defaultValues?: Partial<CreateRecipeInput>;
  onSubmit: (data: CreateRecipeInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function RecipeForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: RecipeFormProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

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
      ingredients: defaultValues?.ingredients || [
        { stock_item_id: '', quantity: 0, unit: 'g' },
      ],
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

        {/* Ingredients */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Skladniki (BOM)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ stock_item_id: '', quantity: 0, unit: 'g' })
                }
                data-action="add-ingredient"
              >
                <Plus className="mr-1 h-4 w-4" />
                Dodaj skladnik
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-2 items-end"
                data-ingredient-index={index}
              >
                {/* Stock Item Select */}
                <div className="col-span-5">
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.stock_item_id`}
                    render={({ field: f }) => (
                      <FormItem>
                        {index === 0 && (
                          <FormLabel className="text-xs">
                            Skladnik
                          </FormLabel>
                        )}
                        <Select
                          onValueChange={f.onChange}
                          value={f.value}
                        >
                          <FormControl>
                            <SelectTrigger
                              data-field={`ingredient-${index}`}
                            >
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stockItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem>
                        {index === 0 && (
                          <FormLabel className="text-xs">Ilosc</FormLabel>
                        )}
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            data-field={`quantity-${index}`}
                            {...f}
                            onChange={(e) =>
                              f.onChange(
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Unit */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.unit`}
                    render={({ field: f }) => (
                      <FormItem>
                        {index === 0 && (
                          <FormLabel className="text-xs">
                            Jedn.
                          </FormLabel>
                        )}
                        <Select
                          onValueChange={f.onChange}
                          value={f.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="l">l</SelectItem>
                            <SelectItem value="szt">szt</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Remove button */}
                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="text-destructive hover:text-destructive"
                    data-action={`remove-ingredient-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Estimated Cost */}
            {estimatedCost > 0 && (
              <div className="flex justify-end pt-3 border-t text-sm">
                <span className="text-muted-foreground mr-2">
                  Szacowany koszt:
                </span>
                <span className="font-bold" data-field="estimated-cost">
                  {estimatedCost.toFixed(2)} zl
                </span>
              </div>
            )}
          </CardContent>
        </Card>

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
