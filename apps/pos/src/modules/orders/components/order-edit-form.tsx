'use client';

import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getProductModifiers, productsRepository, categoriesRepository } from '@/modules/menu/repository';
import { ModifierSelectionDialog } from './modifier-selection-dialog';
import {
  calculateDraftSubtotal,
  calculateDraftTotal,
  calculateEditableItemTotal,
  calculateModifiersPrice,
  createEditableItem,
  editableItemToUpdateItemInput,
  orderItemToEditableItem,
  type EditableOrderItem,
} from '../draft';
import { isOrderEditableStatus } from '@/lib/orders/order-editing';
import { isValidPhoneNumber } from '@/lib/sms/templates';
import type { UpdateOrderInput } from '@/schemas/order';
import { PaymentMethod, PaymentStatus } from '@/types/enums';
import type { Category, MenuModifier, Product, ProductVariant } from '@/types/menu';
import type { Order, OrderItemModifier } from '@/types/order';
import { toast } from 'sonner';
import { getProductPromotionPricing } from '@/modules/menu/utils/pricing';

interface OrderEditFormProps {
  order: Order;
  isSaving?: boolean;
  onSave: (input: UpdateOrderInput) => Promise<void>;
}

interface VariantDialogState {
  open: boolean;
  product: Product | null;
}

interface ModifierDialogState {
  open: boolean;
  product: Product | null;
  variant?: ProductVariant | null;
  modifiers: MenuModifier[];
  targetItemId?: string | null;
}

export function OrderEditForm({
  order,
  isSaving = false,
  onSave,
}: OrderEditFormProps) {
  const [draftItems, setDraftItems] = useState<EditableOrderItem[]>(
    order.items.map(orderItemToEditableItem)
  );
  const [customerName, setCustomerName] = useState(order.customer_name ?? '');
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone ?? '');
  const [notes, setNotes] = useState(order.notes ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [variantDialog, setVariantDialog] = useState<VariantDialogState>({
    open: false,
    product: null,
  });
  const [modifierDialog, setModifierDialog] = useState<ModifierDialogState>({
    open: false,
    product: null,
    modifiers: [],
    targetItemId: null,
  });
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          productsRepository.findAll({
            per_page: 500,
            sort_by: 'sort_order',
            sort_order: 'asc',
          }),
          categoriesRepository.findAll({
            per_page: 200,
            sort_by: 'sort_order',
            sort_order: 'asc',
          }),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setProducts(productsResult.data.filter((product) => product.is_available));
          setCategories(categoriesResult.data.filter((category) => category.is_active));
          setCatalogLoading(false);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCatalogLoading(false);
        toast.error('Nie udało się załadować menu do edycji zamówienia', {
          description: error instanceof Error ? error.message : 'Nieznany błąd',
        });
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== 'all' && product.category_id !== selectedCategory) {
      return false;
    }

    if (!deferredSearch.trim()) {
      return true;
    }

    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return (
      product.name.toLowerCase().includes(normalizedSearch) ||
      (product.description?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });

  const isEditable = isOrderEditableStatus(order.status);
  const subtotal = calculateDraftSubtotal(draftItems);
  const total = calculateDraftTotal(order, draftItems);
  const onlinePaidAmountLocked =
    order.payment_method === PaymentMethod.ONLINE &&
    order.payment_status === PaymentStatus.PAID;
  const amountChanged = total !== order.total;
  const phoneWasPresent = Boolean(order.customer_phone?.trim());
  const phoneValue = customerPhone.trim();
  const phoneInvalid =
    (phoneValue.length > 0 && !isValidPhoneNumber(phoneValue)) ||
    (phoneWasPresent && phoneValue.length === 0);
  const saveDisabled =
    !isEditable ||
    isSaving ||
    draftItems.length === 0 ||
    phoneInvalid ||
    (onlinePaidAmountLocked && amountChanged);

  const handleAddProductClick = async (product: Product) => {
    if (product.variants.length > 0) {
      setVariantDialog({ open: true, product });
      return;
    }

    try {
      const modifiers = await getProductModifiers(product.id);
      if (modifiers.length > 0) {
        setModifierDialog({
          open: true,
          product,
          variant: null,
          modifiers,
          targetItemId: null,
        });
        return;
      }
    } catch {
      // Fall through to add without modifiers.
    }

    setDraftItems((currentItems) => [...currentItems, createEditableItem(product)]);
  };

  const handleVariantSelect = async (product: Product, variant?: ProductVariant) => {
    setVariantDialog({ open: false, product: null });
    try {
      const modifiers = await getProductModifiers(product.id);
      if (modifiers.length > 0) {
        setModifierDialog({
          open: true,
          product,
          variant: variant ?? null,
          modifiers,
          targetItemId: null,
        });
        return;
      }
    } catch {
      // Fall through to add without modifiers.
    }

    setDraftItems((currentItems) => [
      ...currentItems,
      createEditableItem(product, variant),
    ]);
  };

  const handleModifierConfirm = (selectedModifiers: OrderItemModifier[]) => {
    if (!modifierDialog.product) {
      return;
    }

    if (modifierDialog.targetItemId) {
      setDraftItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== modifierDialog.targetItemId) {
            return item;
          }

          const modifiers = [...item.modifiers, ...selectedModifiers];
          const modifiersPrice = calculateModifiersPrice(modifiers);

          return {
            ...item,
            modifiers,
            modifiers_price: modifiersPrice,
            total_price: item.quantity * (item.unit_price + modifiersPrice),
          };
        })
      );
    } else {
      setDraftItems((currentItems) => [
        ...currentItems,
        createEditableItem(
          modifierDialog.product!,
          modifierDialog.variant ?? undefined,
          1,
          selectedModifiers
        ),
      ]);
    }

    setModifierDialog({
      open: false,
      product: null,
      modifiers: [],
      targetItemId: null,
    });
  };

  const handleAddModifiersToItem = async (item: EditableOrderItem) => {
    try {
      const modifiers = await getProductModifiers(item.product_id);
      if (modifiers.length === 0) {
        toast.info('To danie nie ma dostępnych dodatków do edycji');
        return;
      }

      const product = products.find((candidate) => candidate.id === item.product_id);
      if (!product) {
        toast.error('Nie udało się znaleźć produktu w aktualnym menu');
        return;
      }

      const variant = item.variant_id
        ? product.variants.find((candidate) => candidate.id === item.variant_id) ?? null
        : null;

      setModifierDialog({
        open: true,
        product,
        variant,
        modifiers,
        targetItemId: item.id,
      });
    } catch (error) {
      toast.error('Nie udało się pobrać dodatków', {
        description: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setDraftItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      return;
    }

    setDraftItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          quantity,
          total_price: calculateEditableItemTotal({
            quantity,
            unit_price: item.unit_price,
            modifiers: item.modifiers,
          }),
        };
      })
    );
  };

  const handleRemoveModifier = (itemId: string, modifierIndex: number) => {
    setDraftItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const modifiers = item.modifiers.filter((_, index) => index !== modifierIndex);
        const modifiersPrice = calculateModifiersPrice(modifiers);

        return {
          ...item,
          modifiers,
          modifiers_price: modifiersPrice,
          total_price: item.quantity * (item.unit_price + modifiersPrice),
        };
      })
    );
  };

  const handleSave = async () => {
    if (saveDisabled) {
      return;
    }

    const payload: UpdateOrderInput = {
      items: draftItems.map(editableItemToUpdateItemInput),
      customer_name: customerName.trim(),
      notes,
    };

    if (phoneValue) {
      payload.customer_phone = phoneValue;
    }

    await onSave(payload);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4" />
              Skład zamówienia
            </CardTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order-customer-name">Dane klienta</Label>
                <Input
                  id="order-customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Imię i nazwisko"
                  data-field="order-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-customer-phone">Telefon klienta</Label>
                <Input
                  id="order-customer-phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="+48 500 123 456"
                  data-field="order-customer-phone"
                />
                {phoneInvalid && (
                  <p className="text-xs text-destructive">
                    Wprowadź poprawny numer telefonu. Jeśli zamówienie już miało numer, nie pozwalamy go zostawić pustego.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-notes">Notatka do zamówienia</Label>
              <Textarea
                id="order-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Dodaj uwagi dla kuchni lub obsługi"
                rows={3}
                data-field="order-notes"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditable && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Edycja zablokowana</AlertTitle>
                <AlertDescription>
                  To zamówienie jest już poza zakresem edycji.
                </AlertDescription>
              </Alert>
            )}

            {onlinePaidAmountLocked && (
              <Alert
                variant={amountChanged ? 'destructive' : 'default'}
                data-state={amountChanged ? 'blocked' : 'info'}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Płatność online</AlertTitle>
                <AlertDescription>
                  Dla opłaconego zamówienia online możesz zapisać tylko zmiany bez wpływu na kwotę końcową.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {draftItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Zamówienie nie może zostać zapisane bez pozycji. Dodaj przynajmniej jedno danie po prawej stronie.
                </div>
              ) : (
                draftItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                    data-component="editable-order-item"
                    data-id={item.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{formatCurrency(item.unit_price)} / szt.</Badge>
                          {item.promotion_label && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              {item.promotion_label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          data-action="decrease-item-quantity"
                          data-id={item.id}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          data-action="increase-item-quantity"
                          data-id={item.id}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setDraftItems((currentItems) =>
                              currentItems.filter((draftItem) => draftItem.id !== item.id)
                            )
                          }
                          data-action="remove-order-item"
                          data-id={item.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddModifiersToItem(item)}
                        data-action="add-item-modifier"
                        data-id={item.id}
                      >
                        Dodaj/zmień dodatki
                      </Button>
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>

                    {(item.modifiers?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.modifiers.map((modifier, index) => (
                          <button
                            key={`${modifier.modifier_id}-${index}`}
                            type="button"
                            onClick={() => handleRemoveModifier(item.id, index)}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors hover:border-destructive hover:text-destructive"
                            data-action="remove-item-modifier"
                            data-id={`${item.id}-${modifier.modifier_id}-${index}`}
                          >
                            <span>
                              {modifier.modifier_action === 'remove' ? '-' : '+'} {modifier.name}
                            </span>
                            {modifier.price !== 0 && (
                              <span>{formatCurrency(modifier.price)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Dodaj pozycje</CardTitle>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Szukaj dania..."
                  className="pl-9"
                  data-field="order-edit-product-search"
                />
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-1">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                  >
                    Wszystkie
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardHeader>
          <CardContent>
            {catalogLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie menu...</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredProducts.map((product) => {
                  const pricing = getProductPromotionPricing(product);
                  const currentBasePrice = pricing.currentPrice;
                  const minimumPrice = product.variants.length > 0
                    ? Math.min(
                        currentBasePrice,
                        ...product.variants
                          .filter((variant) => variant.is_available)
                          .map((variant) => currentBasePrice + variant.price)
                      )
                    : currentBasePrice;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProductClick(product)}
                      className="rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-muted/40"
                      data-action="add-product-to-order"
                      data-id={product.id}
                    >
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-primary">
                          {product.variants.length > 0
                            ? `od ${formatCurrency(minimumPrice)}`
                            : formatCurrency(currentBasePrice)}
                        </span>
                        {product.variants.length > 0 && (
                          <Badge variant="secondary">
                            {product.variants.filter((variant) => variant.is_available).length} warianty
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podsumowanie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suma częściowa</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Rabat</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {typeof order.delivery_fee === 'number' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dostawa</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            {typeof order.tip === 'number' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Napiwek</span>
                <span>{formatCurrency(order.tip)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Razem</span>
              <span data-field="order-edit-total">{formatCurrency(total)}</span>
            </div>
            {onlinePaidAmountLocked && amountChanged && (
              <p className="text-xs text-destructive">
                Zapis jest zablokowany, bo ta edycja zmienia wartość opłaconego zamówienia.
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saveDisabled}
              data-action="save-order-edit"
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={variantDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setVariantDialog({ open: false, product: null });
          }
        }}
      >
        <DialogContent className="max-w-sm" data-component="order-edit-variant-dialog">
          <DialogHeader>
            <DialogTitle>{variantDialog.product?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Wybierz wariant:</p>
            {variantDialog.product?.variants
              .filter((variant) => variant.is_available)
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((variant) => {
                const pricing = getProductPromotionPricing(variantDialog.product!);
                const basePrice = pricing.currentPrice;
                const finalPrice = basePrice + variant.price;
                const originalFinalPrice = pricing.originalPrice != null
                  ? pricing.originalPrice + variant.price
                  : null;

                return (
                  <Button
                    key={variant.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => handleVariantSelect(variantDialog.product!, variant)}
                    data-action="select-order-edit-variant"
                    data-id={variant.id}
                  >
                    <span>{variant.name}</span>
                    <span className="flex items-center gap-2">
                      {originalFinalPrice != null && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(originalFinalPrice)}
                        </span>
                      )}
                      <span className="font-semibold text-primary">
                        {formatCurrency(finalPrice)}
                      </span>
                    </span>
                  </Button>
                );
              })}
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => handleVariantSelect(variantDialog.product!)}
              data-action="select-order-edit-base"
            >
              <span>Bez wariantu</span>
              <span className="font-semibold">
                {variantDialog.product
                  ? formatCurrency(getProductPromotionPricing(variantDialog.product).currentPrice)
                  : ''}
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {modifierDialog.product && (
        <ModifierSelectionDialog
          open={modifierDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setModifierDialog({
                open: false,
                product: null,
                modifiers: [],
                targetItemId: null,
              });
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
