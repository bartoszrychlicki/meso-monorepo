'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariant, Category, MenuModifier } from '@/types/menu';
import { OrderItemModifier } from '@/types/order';
import { useCart } from '../hooks';
import { CartSidebar } from './cart-sidebar';
import { ModifierSelectionDialog } from './modifier-selection-dialog';
import { getProductModifiers } from '@/modules/menu/repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, ShoppingCart } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

const STORAGE_PREFIX = 'mesopos_';

function loadFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

interface OrderFormProps {
  onOrderCreated: (orderId: string) => void;
}

export function OrderForm({ onOrderCreated }: OrderFormProps) {
  const { addToCart, itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [variantDialog, setVariantDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [modifierDialog, setModifierDialog] = useState<{
    open: boolean;
    product: Product | null;
    variant?: ProductVariant | null;
    modifiers: MenuModifier[];
  }>({ open: false, product: null, modifiers: [] });
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    setProducts(loadFromStorage<Product>('products'));
    setCategories(
      loadFromStorage<Category>('categories').sort(
        (a, b) => a.sort_order - b.sort_order
      )
    );
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.is_available);

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (search.trim()) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower)
      );
    }

    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  }, [products, selectedCategory, search]);

  const handleProductClick = async (product: Product) => {
    if (product.variants.length > 0) {
      setVariantDialog({ open: true, product });
    } else {
      // Fetch modifiers for this product
      try {
        const mods = await getProductModifiers(product.id);
        if (mods.length > 0) {
          setModifierDialog({ open: true, product, variant: null, modifiers: mods });
        } else {
          addToCart(product);
        }
      } catch {
        // If fetching fails, add without modifiers
        addToCart(product);
      }
    }
  };

  const handleVariantSelect = async (product: Product, variant: ProductVariant) => {
    setVariantDialog({ open: false, product: null });
    try {
      const mods = await getProductModifiers(product.id);
      if (mods.length > 0) {
        setModifierDialog({ open: true, product, variant, modifiers: mods });
      } else {
        addToCart(product, variant);
      }
    } catch {
      addToCart(product, variant);
    }
  };

  const handleModifierConfirm = (selectedModifiers: OrderItemModifier[]) => {
    const { product, variant } = modifierDialog;
    if (!product) return;
    addToCart(product, variant ?? undefined, 1, selectedModifiers);
    setModifierDialog({ open: false, product: null, modifiers: [] });
  };

  const getCategoryColor = (cat: Category): string => {
    return cat.color || 'from-gray-400 to-gray-600';
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0" data-component="order-form">
      {/* Left - Product Grid (70%) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj produktu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
              data-field="product-search"
            />
          </div>
          {/* Mobile cart button */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden relative h-10 w-10"
            onClick={() => setShowMobileCart(true)}
            data-action="show-mobile-cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Button>
        </div>

        {/* Category tabs */}
        <div className="border-b bg-background">
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 px-4 py-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-8"
                onClick={() => setSelectedCategory('all')}
                data-action="filter-category"
                data-id="all"
              >
                Wszystkie
              </Button>
              {categories
                .filter((c) => c.is_active)
                .map((cat) => (
                  <Button
                    key={cat.id}
                    variant={
                      selectedCategory === cat.id ? 'default' : 'outline'
                    }
                    size="sm"
                    className="shrink-0 h-8"
                    onClick={() => setSelectedCategory(cat.id)}
                    data-action="filter-category"
                    data-id={cat.id}
                  >
                    {cat.name}
                  </Button>
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* Products grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={cn(
                  'group cursor-pointer overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                  !product.is_available && 'opacity-50 pointer-events-none'
                )}
                onClick={() => handleProductClick(product)}
                data-action="add-to-cart"
                data-id={product.id}
              >
                {/* Color placeholder for image */}
                <div
                  className={cn(
                    'h-24 w-full bg-gradient-to-br',
                    product.color || getCategoryColor(
                      categories.find((c) => c.id === product.category_id) || {
                        color: 'from-gray-400 to-gray-600',
                      } as Category
                    )
                  )}
                >
                  <div className="flex h-full items-center justify-center">
                    <span className="text-2xl font-bold text-white/70">
                      {product.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {product.variants.length > 0
                        ? `od ${formatCurrency(
                            Math.min(
                              product.price,
                              ...product.variants.map((v) => v.price)
                            )
                          )}`
                        : formatCurrency(product.price)}
                    </span>
                    {product.variants.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1"
                      >
                        {product.variants.length} wer.
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <Search className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nie znaleziono produktow
                </p>
                {search && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSelectedCategory('all');
                    }}
                    data-action="clear-search"
                  >
                    Wyczysc filtr
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right - Cart Sidebar (30%) - desktop only */}
      <div className="hidden w-[340px] shrink-0 lg:block">
        <CartSidebar onOrderCreated={onOrderCreated} />
      </div>

      {/* Mobile cart overlay */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileCart(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[340px] max-w-[85vw]">
            <CartSidebar
              onOrderCreated={(id) => {
                setShowMobileCart(false);
                onOrderCreated(id);
              }}
            />
          </div>
        </div>
      )}

      {/* Variant selection dialog */}
      <Dialog
        open={variantDialog.open}
        onOpenChange={(open) => {
          if (!open) setVariantDialog({ open: false, product: null });
        }}
      >
        <DialogContent
          className="max-w-sm"
          data-component="variant-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {variantDialog.product?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Wybierz wariant:</p>
            {variantDialog.product?.variants
              .filter((v) => v.is_available)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((variant) => {
                // Warianty przechowują modyfikacje ceny (+/- PLN)
                const basePrice = variantDialog.product?.price ?? 0;
                const finalPrice = basePrice + variant.price;
                const modDisplay = variant.price === 0
                  ? formatCurrency(finalPrice)
                  : `${formatCurrency(finalPrice)} (${variant.price >= 0 ? '+' : ''}${variant.price.toFixed(2)} PLN)`;

                return (
                  <Button
                    key={variant.id}
                    variant="outline"
                    className="w-full justify-between h-12"
                    onClick={() =>
                      handleVariantSelect(variantDialog.product!, variant)
                    }
                    data-action="select-variant"
                    data-id={variant.id}
                  >
                    <span className="font-medium">{variant.name}</span>
                    <span className="font-bold text-primary">
                      {modDisplay}
                    </span>
                  </Button>
                );
              })}
            {/* Option to add base product without variant */}
            <Button
              variant="ghost"
              className="w-full justify-between h-12 text-muted-foreground"
              onClick={async () => {
                const product = variantDialog.product!;
                setVariantDialog({ open: false, product: null });
                try {
                  const mods = await getProductModifiers(product.id);
                  if (mods.length > 0) {
                    setModifierDialog({ open: true, product, variant: null, modifiers: mods });
                  } else {
                    addToCart(product);
                  }
                } catch {
                  addToCart(product);
                }
              }}
              data-action="select-base"
            >
              <span>Bez wariantu</span>
              <span className="font-bold">
                {formatCurrency(variantDialog.product?.price ?? 0)}
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modifier selection dialog */}
      {modifierDialog.product && (
        <ModifierSelectionDialog
          open={modifierDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              // Add without modifiers when dialog closed
              if (modifierDialog.product) {
                addToCart(modifierDialog.product, modifierDialog.variant ?? undefined);
              }
              setModifierDialog({ open: false, product: null, modifiers: [] });
            }
          }}
          product={modifierDialog.product}
          modifiers={modifierDialog.modifiers}
          variant={modifierDialog.variant}
          onConfirm={handleModifierConfirm}
        />
      )}
    </div>
  );
}
