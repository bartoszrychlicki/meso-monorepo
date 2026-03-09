'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, Category, MenuModifier, ProductVariant, RecipeIngredient, ProductImage } from '@/types/menu';
import { Recipe } from '@/types/recipe';
import { StockItem } from '@/types/inventory';
import { Allergen, ModifierType, ProductType, VariantType } from '@/types/enums';
import { generateSKU } from '@/modules/menu/utils/sku-generator';
import { createDefaultPricing } from '@/modules/menu/utils/pricing';
import { ALLERGEN_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Info,
  Image as ImageIcon,
  Layers,
  Settings2,
  ShieldAlert,
  MapPin,
  Beaker,
  ExternalLink,
  Save,
} from 'lucide-react';
import { ImageUploader } from './image-uploader';
import { ModifierPicker } from './modifier-picker';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { DecimalInput } from '@/components/ui/decimal-input';

const STEPS = [
  { label: 'Podstawowe', icon: Info },
  { label: 'Zdjecia', icon: ImageIcon },
  { label: 'Warianty', icon: Layers },
  { label: 'Modyfikatory', icon: Settings2 },
  { label: 'Alergeny', icon: ShieldAlert },
  { label: 'Dostepnosc', icon: MapPin },
];

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  stockItems: StockItem[];
  recipes: Recipe[];
  allModifiers?: MenuModifier[];
  initialModifierIds?: string[];
  onCreateModifier?: (data: Omit<MenuModifier, 'id' | 'created_at' | 'updated_at'>) => Promise<MenuModifier>;
  onSubmit: (data: Omit<Product, 'created_at' | 'updated_at'>, modifierIds: string[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type ProductModifier = Product['modifier_groups'][number]['modifiers'][number];
type ProductModifierGroup = Product['modifier_groups'][number];

function extractModifierIdsFromLegacyGroups(groups?: Product['modifier_groups']): string[] {
  if (!groups || groups.length === 0) return [];

  const ids = groups
    .flatMap((group) => group.modifiers ?? [])
    .map((modifier) => modifier.id)
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)];
}

function normalizeModifierIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function buildLegacyModifierGroups(
  selectedModifierIds: string[],
  allModifiers: MenuModifier[],
  existingGroups: Product['modifier_groups']
): Product['modifier_groups'] {
  const resolvedModifiers: ProductModifier[] = selectedModifierIds
    .map((modifierId, index) => {
      const modifier = allModifiers.find((item) => item.id === modifierId);
      if (!modifier) return null;

      const now = new Date().toISOString();
      return {
        id: modifier.id,
        name: modifier.name,
        price: modifier.price,
        is_available: modifier.is_available,
        sort_order: index,
        modifier_action: modifier.modifier_action,
        created_at: modifier.created_at ?? now,
        updated_at: modifier.updated_at ?? now,
      } satisfies ProductModifier;
    })
    .filter((modifier): modifier is ProductModifier => Boolean(modifier));

  if (resolvedModifiers.length === 0) return [];

  const now = new Date().toISOString();
  const firstExistingGroup = existingGroups[0];
  const nextGroup: ProductModifierGroup = {
    id: firstExistingGroup?.id ?? crypto.randomUUID(),
    name: firstExistingGroup?.name ?? 'Dodatki',
    type: firstExistingGroup?.type ?? ModifierType.MULTIPLE,
    required: firstExistingGroup?.required ?? false,
    min_selections: firstExistingGroup?.min_selections ?? 0,
    max_selections: Math.max(firstExistingGroup?.max_selections ?? 1, resolvedModifiers.length),
    modifiers: resolvedModifiers,
    created_at: firstExistingGroup?.created_at ?? now,
    updated_at: now,
  };

  return [nextGroup];
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getSuggestedPromoPrice(regularPrice: number): number {
  if (regularPrice <= 0) return 0;

  const suggested = regularPrice > 1 ? regularPrice - 1 : regularPrice * 0.9;
  return Number(Math.max(0.01, suggested).toFixed(2));
}

export function ProductForm({
  product,
  categories,
  stockItems: _stockItems,
  recipes,
  allModifiers = [],
  initialModifierIds,
  onCreateModifier,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const [step, setStep] = useState(0);
  const [productId] = useState(() => product?.id ?? crypto.randomUUID());
  const legacyModifierIds = useMemo(
    () => extractModifierIdsFromLegacyGroups(product?.modifier_groups),
    [product?.modifier_groups]
  );
  const hasExistingPromotion =
    product?.original_price != null &&
    typeof product.original_price === 'number' &&
    product.original_price > product.price;
  const initialRegularPrice = hasExistingPromotion
    ? Number(product.original_price)
    : (product?.price ?? 0);
  const initialPromoPrice = hasExistingPromotion
    ? product!.price
    : getSuggestedPromoPrice(initialRegularPrice);

  // Form state
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');
  const [price, setPrice] = useState(initialRegularPrice);
  const [isPromotionEnabled, setIsPromotionEnabled] = useState(hasExistingPromotion);
  const [promoPrice, setPromoPrice] = useState(initialPromoPrice);
  const [promoLabel, setPromoLabel] = useState(product?.promo_label ?? '');
  const [promoStartsAt, setPromoStartsAt] = useState(toDatetimeLocal(product?.promo_starts_at));
  const [promoEndsAt, setPromoEndsAt] = useState(toDatetimeLocal(product?.promo_ends_at));
  const [prepTime, setPrepTime] = useState(product?.preparation_time_minutes ?? 0);
  const [productType, setProductType] = useState<ProductType>(product?.type ?? ProductType.SINGLE);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);

  // Images
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? []);

  // Modifiers
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>(
    () => (initialModifierIds && initialModifierIds.length > 0 ? initialModifierIds : legacyModifierIds)
  );
  const [modifierSelectionTouched, setModifierSelectionTouched] = useState(false);

  // Sync selectedModifierIds when initialModifierIds arrives asynchronously
  useEffect(() => {
    if (initialModifierIds === undefined || modifierSelectionTouched) return;

    if (initialModifierIds.length > 0) {
      setSelectedModifierIds(initialModifierIds);
      return;
    }

    setSelectedModifierIds(legacyModifierIds);
  }, [initialModifierIds, legacyModifierIds, modifierSelectionTouched]);

  // Allergens
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>(
    product?.allergens ?? []
  );

  // Recipe (BOM)
  const [recipeId, setRecipeId] = useState<string>(product?.recipe_id ?? '');
  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === recipeId) ?? null,
    [recipes, recipeId]
  );

  // Ingredients (legacy, kept for backward compatibility)
  const [ingredients, _setIngredients] = useState<RecipeIngredient[]>(
    product?.ingredients ?? []
  );

  // Nutritional
  const [calories, setCalories] = useState(product?.nutritional_info?.calories ?? 0);
  const [protein, setProtein] = useState(product?.nutritional_info?.protein ?? 0);
  const [carbs, setCarbs] = useState(product?.nutritional_info?.carbs ?? 0);
  const [fat, setFat] = useState(product?.nutritional_info?.fat ?? 0);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
      );
    }
  };

  const toggleAllergen = (allergen: Allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: crypto.randomUUID(),
      name: '',
      price: price,
      is_available: true,
      sort_order: variants.length + 1,
      variant_type: VariantType.SIZE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setVariants([...variants, newVariant]);
    if (productType !== ProductType.WITH_VARIANTS) {
      setProductType(ProductType.WITH_VARIANTS);
    }
  };

  const removeVariant = (variantId: string) => {
    const updated = variants.filter((v) => v.id !== variantId);
    setVariants(updated);
    if (updated.length === 0 && productType === ProductType.WITH_VARIANTS) {
      setProductType(ProductType.SINGLE);
    }
  };

  const updateVariant = (variantId: string, updates: Partial<ProductVariant>) => {
    setVariants(variants.map((v) => (v.id === variantId ? { ...v, ...updates } : v)));
  };

  const handleModifierIdsChange = (modifierIds: string[]) => {
    setModifierSelectionTouched(true);
    setSelectedModifierIds(normalizeModifierIds(modifierIds));
  };

  const isPromotionPriceInvalid = isPromotionEnabled && (promoPrice <= 0 || promoPrice >= price);
  const isPromotionWindowInvalid =
    isPromotionEnabled &&
    Boolean(promoStartsAt && promoEndsAt) &&
    new Date(promoStartsAt) > new Date(promoEndsAt);
  const promotionDiscount = isPromotionEnabled ? Math.max(0, price - promoPrice) : 0;

  const handleSubmit = () => {
    if (isPromotionPriceInvalid) {
      toast.error('Cena promocyjna musi byc nizsza od regularnej');
      return;
    }

    if (isPromotionWindowInvalid) {
      toast.error('Data zakonczenia promocji musi byc pozniejsza od daty startu');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const existingModifierGroups = product?.modifier_groups ?? [];
    const normalizedModifierIds = normalizeModifierIds(selectedModifierIds);
    const nextModifierGroups = buildLegacyModifierGroups(
      normalizedModifierIds,
      allModifiers,
      existingModifierGroups
    );
    const shouldPreserveExistingGroups =
      !modifierSelectionTouched &&
      nextModifierGroups.length === 0 &&
      existingModifierGroups.length > 0;
    const regularPrice = price;
    const effectivePrice = isPromotionEnabled ? promoPrice : regularPrice;

    const data: Omit<Product, 'created_at' | 'updated_at'> = {
      id: productId,
      name,
      slug,
      description,
      category_id: categoryId,
      type: variants.length > 0 ? ProductType.WITH_VARIANTS : productType,
      price: effectivePrice,
      original_price: isPromotionEnabled ? regularPrice : null,
      promo_label: isPromotionEnabled ? (promoLabel.trim() || null) : null,
      promo_starts_at: isPromotionEnabled ? fromDatetimeLocal(promoStartsAt) : null,
      promo_ends_at: isPromotionEnabled ? fromDatetimeLocal(promoEndsAt) : null,
      image_url: images.length > 0 ? images[0].url : undefined,
      images,
      is_available: isAvailable,
      is_featured: isFeatured,
      allergens: selectedAllergens,
      nutritional_info: { calories, protein, carbs, fat },
      variants,
      modifier_groups: shouldPreserveExistingGroups ? existingModifierGroups : nextModifierGroups,
      recipe_id: recipeId || undefined,
      ingredients,
      preparation_time_minutes: prepTime,
      sort_order: product?.sort_order ?? 99,
      color: selectedCategory?.color ?? 'from-gray-400 to-gray-600',
      // NOWE POLA - spec zgodność:
      sku: product?.sku ?? generateSKU(selectedCategory?.name ?? 'PROD', product?.sort_order ?? 99),
      tax_rate: product?.tax_rate ?? 8,
      is_active: product?.is_active ?? true,
      point_ids: product?.point_ids ?? [],
      pricing: product?.pricing ?? createDefaultPricing(effectivePrice, 2),
    };
    onSubmit(data, normalizedModifierIds);
  };

  const canGoNext = () => {
    if (step === 0) return name.length > 0 && categoryId.length > 0 && price > 0;
    if (step === 1) return true;
    return true;
  };

  return (
    <div className="space-y-6" data-component="product-form">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const _Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                i === step
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : i < step
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
              data-action="go-to-step"
              data-id={String(i)}
            >
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  i === step
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : i < step
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="hidden md:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <Card className="py-4">
        <CardContent>
          {/* Step 1: Basic info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nazwa produktu *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="np. Cheeseburger"
                    data-field="product-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="cheeseburger"
                    data-field="product-slug"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategoria *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger data-field="product-category">
                      <SelectValue placeholder="Wybierz kategorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Cena regularna (PLN) *</Label>
                  <DecimalInput
                    id="price"
                    value={price}
                    onChange={(value) => setPrice(value ?? 0)}
                    data-field="product-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prep-time">Czas przygotowania (min)</Label>
                  <Input
                    id="prep-time"
                    type="number"
                    min="0"
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                    data-field="product-prep-time"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4" data-component="promotion-settings">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="promotion-enabled"
                    checked={isPromotionEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = checked === true;
                      setIsPromotionEnabled(enabled);
                      if (enabled && (promoPrice <= 0 || promoPrice >= price)) {
                        setPromoPrice(getSuggestedPromoPrice(price));
                      }
                      if (!enabled) {
                        setPromoLabel('');
                        setPromoStartsAt('');
                        setPromoEndsAt('');
                      }
                    }}
                    data-field="promotion-enabled"
                  />
                  <div>
                    <Label htmlFor="promotion-enabled" className="text-sm font-medium">
                      Promocja cenowa
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cena produktu (pole wyzej) pozostaje regularna. Podaj cene promocyjna ponizej.
                    </p>
                  </div>
                </div>

                {isPromotionEnabled && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="promo-price">Cena promocyjna (PLN)</Label>
                      <DecimalInput
                        id="promo-price"
                        value={promoPrice}
                        onChange={(value) => setPromoPrice(value ?? 0)}
                        data-field="product-promo-price"
                      />
                      {isPromotionPriceInvalid && (
                        <p className="text-xs text-destructive">
                          Cena promocyjna musi byc nizsza od regularnej.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo-label">Label promocji</Label>
                      <Input
                        id="promo-label"
                        value={promoLabel}
                        onChange={(e) => setPromoLabel(e.target.value)}
                        placeholder="np. -20% Happy Hour"
                        maxLength={64}
                        data-field="product-promo-label"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo-starts-at">Start promocji</Label>
                      <Input
                        id="promo-starts-at"
                        type="datetime-local"
                        value={promoStartsAt}
                        onChange={(e) => setPromoStartsAt(e.target.value)}
                        data-field="product-promo-starts-at"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo-ends-at">Koniec promocji</Label>
                      <Input
                        id="promo-ends-at"
                        type="datetime-local"
                        value={promoEndsAt}
                        onChange={(e) => setPromoEndsAt(e.target.value)}
                        data-field="product-promo-ends-at"
                      />
                      {isPromotionWindowInvalid && (
                        <p className="text-xs text-destructive">
                          Koniec promocji musi byc pozniejszy niz start.
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Podglad: </span>
                      <span className="line-through text-muted-foreground">
                        {formatCurrency(price)}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold text-foreground">{formatCurrency(promoPrice)}</span>
                      {promotionDiscount > 0 && (
                        <span className="ml-2 text-emerald-600">
                          oszczednosc {formatCurrency(promotionDiscount)}
                        </span>
                      )}
                      {promoLabel.trim() && (
                        <Badge className="ml-2">{promoLabel.trim()}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opis produktu..."
                  rows={3}
                  data-field="product-description"
                />
              </div>

              {/* Recipe (BOM) picker */}
              <div className="space-y-2" data-component="recipe-picker">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recipe">Receptura (BOM)</Label>
                  <a
                    href="/recipes/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-action="create-recipe"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Dodaj nowa recepture
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Select value={recipeId} onValueChange={setRecipeId}>
                  <SelectTrigger data-field="recipe-id">
                    <SelectValue placeholder="Wybierz recepture..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({formatCurrency(r.cost_per_unit)}/{r.yield_unit})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedRecipe && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Beaker className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{selectedRecipe.name}</span>
                        <span className="text-muted-foreground">
                          &middot; {selectedRecipe.ingredients.length} skladnikow
                        </span>
                      </div>
                      {selectedRecipe.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 ml-5">
                          {selectedRecipe.allergens.map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {ALLERGEN_LABELS[a]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium">{formatCurrency(selectedRecipe.cost_per_unit)}</div>
                      {price > 0 && (
                        <div className={cn(
                          'text-xs font-medium',
                          (selectedRecipe.cost_per_unit / price) * 100 < 25 ? 'text-green-600' :
                          (selectedRecipe.cost_per_unit / price) * 100 < 35 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          {((selectedRecipe.cost_per_unit / price) * 100).toFixed(1)}% food cost
                        </div>
                      )}
                    </div>
                    <a
                      href={`/recipes/${selectedRecipe.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary shrink-0"
                      data-action="view-recipe"
                      title="Szczegoly receptury"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={(checked) => setIsFeatured(checked === true)}
                    data-field="product-featured"
                  />
                  <Label htmlFor="featured" className="text-sm">
                    Wyrozniaj w menu
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="available"
                    checked={isAvailable}
                    onCheckedChange={(checked) => setIsAvailable(checked === true)}
                    data-field="product-available"
                  />
                  <Label htmlFor="available" className="text-sm">
                    Dostepny
                  </Label>
                </div>
              </div>

              {/* Nutritional info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Informacje zywieniowe</Label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kalorie</Label>
                    <Input
                      type="number"
                      min="0"
                      value={calories}
                      onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                      className="h-8"
                      data-field="calories"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bialko (g)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={protein}
                      onChange={(e) => setProtein(parseInt(e.target.value) || 0)}
                      className="h-8"
                      data-field="protein"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Weglowodany (g)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={carbs}
                      onChange={(e) => setCarbs(parseInt(e.target.value) || 0)}
                      className="h-8"
                      data-field="carbs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tluszcz (g)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={fat}
                      onChange={(e) => setFat(parseInt(e.target.value) || 0)}
                      className="h-8"
                      data-field="fat"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Images */}
          {step === 1 && (
            <ImageUploader
              productId={productId}
              images={images}
              onChange={setImages}
            />
          )}

          {/* Step 3: Variants */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Warianty cenowe</h3>
                  <p className="text-sm text-muted-foreground">
                    Podaj korektę ceny względem ceny bazowej produktu (to nie jest cena końcowa wariantu).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cena końcowa wariantu = cena bazowa ({formatCurrency(price)}) + korekta (+/- PLN).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                  data-action="add-variant"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Dodaj wariant
                </Button>
              </div>

              {variants.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Brak wariantow. Produkt bedzie sprzedawany w jednej cenie.
                </div>
              ) : (
                <div className="space-y-3">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                        placeholder="Nazwa wariantu (np. Średni)"
                        className="flex-1"
                        data-field="variant-name"
                      />
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            Korekta (+/- PLN):
                          </Label>
                          <DecimalInput
                            allowNegative
                            value={variant.price}
                            onChange={(value) =>
                              updateVariant(variant.id, {
                                price: value ?? 0,
                              })
                            }
                            placeholder="0.00"
                            className="w-28"
                            data-field="variant-price"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Cena końcowa: {formatCurrency(price + (variant.price || 0))}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(variant.id)}
                        className="text-muted-foreground hover:text-destructive"
                        data-action="remove-variant"
                        data-id={variant.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Modifiers */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Modyfikatory</h3>
                <p className="text-sm text-muted-foreground">
                  Wybierz modyfikatory dostepne dla tego produktu
                </p>
              </div>
              <ModifierPicker
                allModifiers={allModifiers}
                selectedModifierIds={selectedModifierIds}
                onChange={handleModifierIdsChange}
                recipes={recipes}
                onCreateModifier={onCreateModifier ?? (async (data) => ({ ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }))}
              />
            </div>
          )}

          {/* Step 5: Allergens */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Alergeny (14 alergenow UE)</h3>
                <p className="text-sm text-muted-foreground">
                  Zaznacz alergeny wystepujace w produkcie
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.values(Allergen).map((allergen) => (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => toggleAllergen(allergen)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm transition-all',
                      selectedAllergens.includes(allergen)
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted'
                    )}
                    data-action="toggle-allergen"
                    data-id={allergen}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border',
                        selectedAllergens.includes(allergen)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      )}
                    >
                      {selectedAllergens.includes(allergen) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    {ALLERGEN_LABELS[allergen]}
                  </button>
                ))}
              </div>
              {selectedAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {selectedAllergens.map((a) => (
                    <Badge key={a} variant="secondary" className="text-xs">
                      {ALLERGEN_LABELS[a]}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Availability */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Dostepnosc</h3>
                <p className="text-sm text-muted-foreground">
                  Produkt jest dostepny we wszystkich lokalizacjach
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="is-available"
                    checked={isAvailable}
                    onCheckedChange={(checked) => setIsAvailable(checked === true)}
                    data-field="product-available-final"
                  />
                  <div>
                    <Label htmlFor="is-available" className="font-medium">
                      Produkt aktywny
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wylacz, aby ukryc produkt w POS i na stronie
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <Card className="py-4 bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Podsumowanie</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Nazwa:</dt>
                      <dd className="font-medium">{name || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cena regularna:</dt>
                      <dd className="font-medium">{price > 0 ? `${price.toFixed(2)} PLN` : '-'}</dd>
                    </div>
                    {isPromotionEnabled && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Cena promocyjna:</dt>
                          <dd className="font-medium">
                            {promoPrice > 0 ? `${promoPrice.toFixed(2)} PLN` : '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Label promo:</dt>
                          <dd className="font-medium">{promoLabel.trim() || '-'}</dd>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Zdjecia:</dt>
                      <dd className="font-medium">{images.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Warianty:</dt>
                      <dd className="font-medium">{variants.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Modyfikatory:</dt>
                      <dd className="font-medium">{selectedModifierIds.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Alergeny:</dt>
                      <dd className="font-medium">{selectedAllergens.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Receptura:</dt>
                      <dd className="font-medium">{selectedRecipe?.name ?? 'Brak'}</dd>
                    </div>
                    {selectedRecipe && price > 0 && (() => {
                      const costPct = (selectedRecipe.cost_per_unit / price) * 100;
                      return (
                        <>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Food cost:</dt>
                            <dd className="font-medium">{formatCurrency(selectedRecipe.cost_per_unit)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Food cost %:</dt>
                            <dd className={cn(
                              'font-medium',
                              costPct < 25 ? 'text-green-600' :
                              costPct < 35 ? 'text-yellow-600' : 'text-red-600'
                            )}>
                              {costPct.toFixed(1)}%
                            </dd>
                          </div>
                        </>
                      );
                    })()}
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? onCancel : () => setStep(step - 1)}
          data-action={step === 0 ? 'cancel' : 'prev-step'}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {step === 0 ? 'Anuluj' : 'Wstecz'}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !name ||
              !categoryId ||
              price <= 0 ||
              isPromotionPriceInvalid ||
              isPromotionWindowInvalid
            }
            variant={step < STEPS.length - 1 ? 'outline' : 'default'}
            data-action="submit-product"
          >
            <Save className="mr-1 h-4 w-4" />
            {isSubmitting ? 'Zapisywanie...' : product ? 'Zapisz zmiany' : 'Zapisz'}
          </Button>
          {step < STEPS.length - 1 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              data-action="next-step"
            >
              Dalej
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
