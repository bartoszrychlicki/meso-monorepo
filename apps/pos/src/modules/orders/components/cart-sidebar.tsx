'use client';

import { useState } from 'react';
import { useCart } from '../hooks';
import { OrderSource, PaymentMethod } from '@/types/enums';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CartSidebarProps {
  onOrderCreated: (orderId: string) => void;
}

export function CartSidebar({ onOrderCreated }: CartSidebarProps) {
  const {
    cart,
    customerName,
    customerPhone,
    source,
    paymentMethod,
    notes,
    total,
    itemCount,
    updateQuantity,
    removeFromCart,
    setCustomer,
    setSource,
    setPaymentMethod,
    setNotes,
    clearCart,
    createOrder,
  } = useCart();

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateOrder = async () => {
    setIsCreating(true);
    try {
      const order = await createOrder();
      onOrderCreated(order.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany blad';
      toast.error('Nie udalo sie zlozyc zamowienia', {
        description: message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="flex h-full flex-col border-l bg-card"
      data-component="cart-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="font-semibold">Koszyk</h2>
          {itemCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {itemCount}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            data-action="clear-cart"
          >
            <X className="mr-1 h-3 w-3" />
            Wyczysc
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            Koszyk jest pusty
          </p>
          <p className="text-xs text-muted-foreground">
            Kliknij produkt aby dodac do zamowienia
          </p>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <ScrollArea className="flex-1">
            <div className="divide-y px-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 py-3"
                  data-id={item.id}
                  data-component="cart-item"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {item.product_name}
                    </p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">
                        {item.variant_name}
                      </p>
                    )}
                    {(item.modifiers?.length ?? 0) > 0 && (
                      <div className="mt-0.5">
                        {item.modifiers!.map((mod) => (
                          <p
                            key={mod.modifier_id}
                            className="text-[10px] text-muted-foreground"
                          >
                            {mod.modifier_action === 'remove' ? '\u2212' : '+'} {mod.name}
                            {mod.price > 0 && ` (+${formatCurrency(mod.price)})`}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(item.total_price)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromCart(item.id)}
                      data-action="remove-from-cart"
                      data-id={item.id}
                      aria-label={`Usun ${item.product_name} z koszyka`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        data-action="decrease-quantity"
                        data-id={item.id}
                        aria-label={`Zmniejsz ilosc ${item.product_name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        data-action="increase-quantity"
                        data-id={item.id}
                        aria-label={`Zwieksz ilosc ${item.product_name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Order details - compact layout for speed */}
          <div className="border-t">
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-3 p-4">
                {/* Source + Payment side by side for speed */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Typ
                    </Label>
                    <Select
                      value={source}
                      onValueChange={(v) => setSource(v as OrderSource)}
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-field="source"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={OrderSource.DINE_IN}>
                          Na miejscu
                        </SelectItem>
                        <SelectItem value={OrderSource.TAKEAWAY}>
                          Na wynos
                        </SelectItem>
                        <SelectItem value={OrderSource.DELIVERY}>
                          Dostawa
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Platnosc
                    </Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) =>
                        setPaymentMethod(v as PaymentMethod)
                      }
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-field="payment-method"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.CASH}>
                          Gotowka
                        </SelectItem>
                        <SelectItem value={PaymentMethod.CARD}>
                          Karta
                        </SelectItem>
                        <SelectItem value={PaymentMethod.BLIK}>
                          BLIK
                        </SelectItem>
                        <SelectItem value={PaymentMethod.ONLINE}>
                          Online
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes - single line input for speed */}
                <Input
                  placeholder="Uwagi do zamowienia..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-sm"
                  data-field="notes"
                />

                {/* Customer info - optional, collapsed for walk-in speed */}
                <div className="space-y-1.5 pt-1 border-t">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Klient (opcjonalne)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Imie"
                      value={customerName}
                      onChange={(e) =>
                        setCustomer(e.target.value, customerPhone)
                      }
                      className="h-8 text-sm"
                      data-field="customer-name"
                    />
                    <Input
                      placeholder="Telefon"
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomer(customerName, e.target.value)
                      }
                      className="h-8 text-sm"
                      data-field="customer-phone"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Total and submit */}
          <div className="border-t bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Razem</span>
              <span className="text-2xl font-black tracking-tight" data-field="cart-total">
                {formatCurrency(total)}
              </span>
            </div>
            <Button
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg"
              onClick={handleCreateOrder}
              disabled={cart.length === 0 || isCreating}
              data-action="place-order"
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-5 w-5" />
              )}
              {isCreating ? 'Skladanie zamowienia...' : `Zloz zamowienie - ${formatCurrency(total)}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
