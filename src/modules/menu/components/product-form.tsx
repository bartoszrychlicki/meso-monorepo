'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Product, Category, ModifierGroup, ProductVariant, RecipeIngredient, ProductImage } from '@/types/menu';
import { StockItem } from '@/types/inventory';
import { Allergen, ProductType, VariantType, SalesChannel } from '@/types/enums';
import { generateSKU } from '@/modules/menu/utils/sku-generator';
import { createDefaultPricing } from '@/modules/menu/utils/pricing';
import { MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT } from '@/schemas/menu';
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
  AlertCircle,
  GripVertical,
  Link,
} from 'lucide-react';
import { ModifierSelector } from './modifier-selector';
import { IngredientSelector } from './ingredient-selector';
import { calculateFoodCost } from '../utils/food-cost';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

const STEPS = [
  { label: 'Podstawowe', icon: Info },
  { label: 'Zdjecia', icon: ImageIcon },
  { label: 'Warianty', icon: Layers },
  { label: 'Modyfikatory', icon: Settings2 },
  { label: 'Alergeny', icon: ShieldAlert },
  { label: 'Skladniki', icon: Beaker },
  { label: 'Dostepnosc', icon: MapPin },
];

const PRODUCT_PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';
const MAX_IMAGES = 3;

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  stockItems: StockItem[];
  onSubmit: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({
  product,
  categories,
  stockItems,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const [step, setStep] = useState(0);

  // Form state
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');
  const [price, setPrice] = useState(product?.price ?? 0);
  const [prepTime, setPrepTime] = useState(product?.preparation_time_minutes ?? 0);
  const [productType, setProductType] = useState<ProductType>(product?.type ?? ProductType.SINGLE);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);

  // Images
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? []);

  // Modifiers
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(
    product?.modifier_groups ?? []
  );

  // Allergens
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>(
    product?.allergens ?? []
  );

  // Ingredients
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
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

  // Image handling
  const validateAndAddImage = useCallback(async () => {
    if (!imageUrl.trim()) return;

    setImageError(null);
    setIsLoadingImage(true);

    if (images.length >= MAX_IMAGES) {
      setImageError(`Maksymalnie ${MAX_IMAGES} zdjecia`);
      setIsLoadingImage(false);
      return;
    }

    try {
      new URL(imageUrl);
    } catch {
      setImageError('Nieprawidlowy URL');
      setIsLoadingImage(false);
      return;
    }

    // Check if URL already added
    if (images.some((img) => img.url === imageUrl)) {
      setImageError('To zdjecie jest juz dodane');
      setIsLoadingImage(false);
      return;
    }

    // Load image to validate resolution
    try {
      const dimensions = await getImageDimensions(imageUrl);

      if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
        setImageError(
          `Zdjecie jest za male (${dimensions.width}x${dimensions.height}px). Minimalna rozdzielczosc to ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`
        );
        setIsLoadingImage(false);
        return;
      }

      const newImage: ProductImage = {
        id: crypto.randomUUID(),
        url: imageUrl,
        alt: name || 'Zdjecie produktu',
        width: dimensions.width,
        height: dimensions.height,
        sort_order: images.length,
      };

      setImages((prev) => [...prev, newImage]);
      setImageUrl('');
      setImageError(null);
    } catch {
      setImageError('Nie udalo sie zaladowac zdjecia. Sprawdz URL.');
    } finally {
      setIsLoadingImage(false);
    }
  }, [imageUrl, images, name]);

  const removeImage = (imageId: string) => {
    setImages((prev) =>
      prev
        .filter((img) => img.id !== imageId)
        .map((img, idx) => ({ ...img, sort_order: idx }))
    );
  };

  const moveImage = (imageId: string, direction: 'up' | 'down') => {
    setImages((prev) => {
      const idx = prev.findIndex((img) => img.id === imageId);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;

      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return updated.map((img, i) => ({ ...img, sort_order: i }));
    });
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

  const handleSubmit = () => {
    const selectedCategory = categories.find((c) => c.id === categoryId);
    const data: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
      name,
      slug,
      description,
      category_id: categoryId,
      type: variants.length > 0 ? ProductType.WITH_VARIANTS : productType,
      price,
      image_url: images.length > 0 ? images[0].url : undefined,
      images,
      is_available: isAvailable,
      is_featured: isFeatured,
      allergens: selectedAllergens,
      nutritional_info: { calories, protein, carbs, fat },
      variants,
      modifier_groups: modifierGroups,
      ingredients,
      preparation_time_minutes: prepTime,
      sort_order: product?.sort_order ?? 99,
      color: selectedCategory?.color ?? 'from-gray-400 to-gray-600',
      // NOWE POLA - spec zgodność:
      sku: product?.sku ?? generateSKU(selectedCategory?.name ?? 'PROD', product?.sort_order ?? 99),
      tax_rate: product?.tax_rate ?? 8,
      is_active: product?.is_active ?? true,
      point_ids: product?.point_ids ?? [],
      pricing: product?.pricing ?? createDefaultPricing(price, 2),
    };
    onSubmit(data);
  };

  const canGoNext = () => {
    if (step === 0) return name.length > 0 && categoryId.length > 0 && price > 0;
    if (step === 1) return images.length >= 1;
    return true;
  };

  return (
    <div className="space-y-6" data-component="product-form">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
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
                  <Label htmlFor="price">Cena (PLN) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
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
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Zdjecia produktu *</h3>
                <p className="text-sm text-muted-foreground">
                  Dodaj od 1 do {MAX_IMAGES} zdjec produktu (min. rozdzielczosc: {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}px). Pierwsze zdjecie bedzie glownym.
                </p>
              </div>

              {/* Add image via URL */}
              <div className="space-y-2">
                <Label htmlFor="image-url">URL zdjecia</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImageError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          validateAndAddImage();
                        }
                      }}
                      placeholder="https://example.com/zdjecie.jpg"
                      className="pl-9"
                      disabled={images.length >= MAX_IMAGES || isLoadingImage}
                      data-field="product-image-url"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={validateAndAddImage}
                    disabled={!imageUrl.trim() || images.length >= MAX_IMAGES || isLoadingImage}
                    data-action="add-image"
                  >
                    {isLoadingImage ? (
                      <span className="animate-pulse">Ladowanie...</span>
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" />
                        Dodaj
                      </>
                    )}
                  </Button>
                </div>
                {imageError && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {imageError}
                  </div>
                )}
              </div>

              {/* Image list */}
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <img
                    src={PRODUCT_PLACEHOLDER_IMAGE}
                    alt="Placeholder"
                    className="mb-3 h-24 w-32 rounded opacity-60"
                  />
                  <p className="text-sm text-muted-foreground">
                    Brak zdjec. Dodaj co najmniej 1 zdjecie produktu.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3',
                        idx === 0 && 'border-primary/30 bg-primary/5'
                      )}
                      data-id={img.id}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveImage(img.id, 'up')}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          data-action="move-image-up"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                        </button>
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <button
                          type="button"
                          onClick={() => moveImage(img.id, 'down')}
                          disabled={idx === images.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          data-action="move-image-down"
                        >
                          <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                        </button>
                      </div>

                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.alt || 'Zdjecie produktu'}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <Badge variant="default" className="text-xs">Glowne</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {img.width}x{img.height}px
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={img.url}>
                          {img.url}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(img.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        data-action="remove-image"
                        data-id={img.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Image count indicator */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{images.length}/{MAX_IMAGES} zdjec</span>
                {images.length < 1 && (
                  <span className="text-destructive">Wymagane co najmniej 1 zdjecie</span>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Variants */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Warianty cenowe</h3>
                  <p className="text-sm text-muted-foreground">
                    Dodaj warianty z modyfikacją ceny (np. Mały: -5 PLN, Średni: +0 PLN, Duży: +10 PLN)
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
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          +/- PLN:
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0"
                          className="w-28"
                          data-field="variant-price"
                        />
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
                <h3 className="font-medium">Grupy modyfikatorow</h3>
                <p className="text-sm text-muted-foreground">
                  Dodaj grupy dodatkow, sosow i innych modyfikatorow
                </p>
              </div>
              <ModifierSelector
                modifierGroups={modifierGroups}
                onChange={setModifierGroups}
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

          {/* Step 6: Ingredients */}
          {step === 5 && (
            <IngredientSelector
              ingredients={ingredients}
              onChange={setIngredients}
              stockItems={stockItems}
              productPrice={price}
            />
          )}

          {/* Step 7: Availability */}
          {step === 6 && (
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
                      <dt className="text-muted-foreground">Cena:</dt>
                      <dd className="font-medium">{price > 0 ? `${price.toFixed(2)} PLN` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Zdjecia:</dt>
                      <dd className="font-medium">{images.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Warianty:</dt>
                      <dd className="font-medium">{variants.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Grupy modyfikatorow:</dt>
                      <dd className="font-medium">{modifierGroups.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Alergeny:</dt>
                      <dd className="font-medium">{selectedAllergens.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Skladniki:</dt>
                      <dd className="font-medium">{ingredients.length}</dd>
                    </div>
                    {ingredients.length > 0 && price > 0 && (() => {
                      const fc = calculateFoodCost(ingredients, stockItems, price);
                      return (
                        <>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Food cost:</dt>
                            <dd className="font-medium">{formatCurrency(fc.totalCost)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Food cost %:</dt>
                            <dd className={cn(
                              'font-medium',
                              fc.costPercentage < 25 ? 'text-green-600' :
                              fc.costPercentage < 35 ? 'text-yellow-600' : 'text-red-600'
                            )}>
                              {fc.costPercentage.toFixed(1)}%
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

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canGoNext()}
            data-action="next-step"
          >
            Dalej
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !categoryId || price <= 0 || images.length < 1}
            data-action="submit-product"
          >
            {isSubmitting ? 'Zapisywanie...' : product ? 'Zapisz zmiany' : 'Dodaj produkt'}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Load an image from URL and return its natural dimensions */
function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}
