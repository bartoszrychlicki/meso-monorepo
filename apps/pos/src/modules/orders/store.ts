import { create } from 'zustand';
import { Order, OrderItem, OrderItemModifier } from '@/types/order';
import type { OrderCancellationResult } from '@/types/order-cancel';
import {
  OrderClosureReasonCode,
  OrderStatus,
  OrderChannel,
  OrderSource,
  PaymentMethod,
  PaymentStatus,
} from '@/types/enums';
import { Product, ProductVariant } from '@/types/menu';
import { KitchenTicket, KitchenItem } from '@/types/kitchen';
import { ordersRepository } from './repository';
import { createRepository } from '@/lib/data/repository-factory';
import { LOCATION_IDS } from '@/seed/data/locations';
import { USER_IDS } from '@/seed/data/users';
import {
  formatKitchenModifierLabel,
  normalizeKitchenModifierLabels,
} from '@/modules/kitchen/formatting';
import { getProductPromotionPricing } from '@/modules/menu/utils/pricing';
import { getOrderStatsForLocalDay } from './stats';

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  promotion_label?: string;
  modifiers: OrderItemModifier[];
  modifiers_price: number;
  total_price: number;
  notes?: string;
}

interface OrdersStore {
  orders: Order[];
  activeOrders: Order[];
  selectedOrder: Order | null;
  filterStatus: OrderStatus | 'all';
  isLoading: boolean;

  // Cart state
  cart: CartItem[];
  cartCustomerName: string;
  cartCustomerPhone: string;
  cartChannel: OrderChannel;
  cartSource: OrderSource;
  cartPaymentMethod: PaymentMethod;
  cartNotes: string;

  // Actions
  loadOrders: () => Promise<void>;
  loadActiveOrders: () => Promise<void>;
  selectOrder: (order: Order | null) => void;
  setFilterStatus: (status: OrderStatus | 'all') => void;
  createOrder: () => Promise<Order>;
  updateOrderStatus: (
    id: string,
    status: OrderStatus,
    note?: string
  ) => Promise<void>;
  cancelOrder: (
    id: string,
    input: {
      closureReasonCode?: OrderClosureReasonCode | null;
      closureReason?: string;
      requestRefund?: boolean;
    }
  ) => Promise<OrderCancellationResult>;

  // Cart actions
  addToCart: (
    product: Product,
    variant?: ProductVariant,
    quantity?: number,
    modifiers?: OrderItemModifier[]
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  addModifierToCartItem: (
    itemId: string,
    modifier: OrderItemModifier
  ) => void;
  removeModifierFromCartItem: (
    itemId: string,
    modifierId: string
  ) => void;
  setCartCustomer: (name: string, phone: string) => void;
  setCartChannel: (channel: OrderChannel) => void;
  setCartSource: (source: OrderSource) => void;
  setCartPaymentMethod: (method: PaymentMethod) => void;
  setCartNotes: (notes: string) => void;
  clearCart: () => void;

  // Computed helpers
  cartTotal: () => number;
  cartItemCount: () => number;
  filteredOrders: () => Order[];
  todaysRevenue: () => number;
  todaysOrderCount: () => number;
}

export const useOrdersStore = create<OrdersStore>((set, get) => ({
  orders: [],
  activeOrders: [],
  selectedOrder: null,
  filterStatus: 'all',
  isLoading: false,

  // Cart defaults
  cart: [],
  cartCustomerName: '',
  cartCustomerPhone: '',
  cartChannel: OrderChannel.POS,
  cartSource: OrderSource.TAKEAWAY,
  cartPaymentMethod: PaymentMethod.CASH,
  cartNotes: '',

  loadOrders: async () => {
    set({ isLoading: true });
    try {
      const result = await ordersRepository.findAll({
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 200,
      });
      set({ orders: result.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadActiveOrders: async () => {
    try {
      const active = await ordersRepository.getActiveOrders();
      set({ activeOrders: active });
    } catch {
      // silent
    }
  },

  selectOrder: (order) => set({ selectedOrder: order }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  createOrder: async () => {
    const state = get();
    if (state.cart.length === 0) {
      throw new Error('Cart is empty');
    }

    const orderNumber = await ordersRepository.generateOrderNumber();
    const now = new Date().toISOString();

    const items: OrderItem[] = state.cart.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      variant_id: item.variant_id,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      original_unit_price: item.original_unit_price,
      promotion_label: item.promotion_label,
      modifiers: item.modifiers,
      subtotal: item.total_price,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Math.round(subtotal * 0.23 * 100) / 100;
    const total = Math.round(subtotal * 100) / 100;

    const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
      order_number: orderNumber,
      status: OrderStatus.PENDING,
      channel: state.cartChannel,
      source: state.cartSource,
      location_id: LOCATION_IDS.FOOD_TRUCK_MOKOTOW,
      customer_name: state.cartCustomerName || undefined,
      customer_phone: state.cartCustomerPhone || undefined,
      items,
      subtotal,
      tax,
      discount: 0,
      total,
      payment_method: state.cartPaymentMethod,
      payment_status: PaymentStatus.PENDING,
      notes: state.cartNotes || undefined,
      status_history: [
        {
          status: OrderStatus.PENDING,
          timestamp: now,
          changed_by: USER_IDS.CASHIER,
        },
      ],
      assigned_to: USER_IDS.CASHIER,
    };

    const newOrder = await ordersRepository.create(orderData);

    // Auto-create kitchen ticket for the new order
    try {
      const kitchenItems: KitchenItem[] = newOrder.items.map((item) => ({
        id: crypto.randomUUID(),
        order_item_id: item.id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        quantity: item.quantity,
        modifiers: normalizeKitchenModifierLabels(
          item.modifiers.map((modifier) => formatKitchenModifierLabel(modifier))
        ),
        notes: item.notes,
        is_done: false,
      }));

      const ticketData: Omit<KitchenTicket, 'id' | 'created_at' | 'updated_at'> = {
        order_id: newOrder.id,
        order_number: newOrder.order_number,
        location_id: newOrder.location_id,
        status: OrderStatus.PENDING,
        items: kitchenItems,
        priority: 0,
        estimated_minutes: Math.max(5, kitchenItems.length * 4),
        notes: newOrder.notes,
      };

      const kitchenRepo = createRepository<KitchenTicket>('kitchen_tickets');
      await kitchenRepo.create(ticketData);
    } catch {
      // Kitchen ticket creation failure should not block order creation
    }

    // Clear cart
    set({
      cart: [],
      cartCustomerName: '',
      cartCustomerPhone: '',
      cartNotes: '',
      cartChannel: OrderChannel.POS,
      cartSource: OrderSource.TAKEAWAY,
      cartPaymentMethod: PaymentMethod.CASH,
    });

    // Reload orders
    await get().loadOrders();
    await get().loadActiveOrders();

    return newOrder;
  },

  updateOrderStatus: async (id, status, note) => {
    await ordersRepository.updateStatus(id, status, note);
    await get().loadOrders();
    await get().loadActiveOrders();

    // Update selected order if it was the one changed
    const state = get();
    if (state.selectedOrder?.id === id) {
      const updated = await ordersRepository.findById(id);
      set({ selectedOrder: updated });
    }
  },

  cancelOrder: async (id, input) => {
    const result = await ordersRepository.cancelOrder(id, input);
    await get().loadOrders();
    await get().loadActiveOrders();
    const selectedOrder = await ordersRepository.findById(id);
    if (selectedOrder) {
      set({ selectedOrder });
    }

    return result;
  },

  // Cart actions
  addToCart: (product, variant, quantity = 1, modifiers = []) => {
    const state = get();
    const promotionPricing = getProductPromotionPricing(product);
    const basePrice = promotionPricing.currentPrice;
    const baseOriginalPrice = promotionPricing.originalPrice;
    const price = basePrice + (variant?.price ?? 0);
    const originalUnitPrice = baseOriginalPrice != null
      ? baseOriginalPrice + (variant?.price ?? 0)
      : undefined;
    const promotionLabel = promotionPricing.isPromotionActive
      ? promotionPricing.promoLabel
      : undefined;
    const modifiers_price = modifiers.reduce((sum, m) => sum + m.price * m.quantity, 0);

    // Only merge with existing item if no modifiers
    if (modifiers.length === 0) {
      const existingIndex = state.cart.findIndex(
        (item) =>
          item.product_id === product.id &&
          item.variant_id === (variant?.id ?? undefined) &&
          item.unit_price === price &&
          item.original_unit_price === originalUnitPrice &&
          item.promotion_label === promotionLabel &&
          item.modifiers.length === 0
      );

      if (existingIndex >= 0) {
        const updated = [...state.cart];
        const item = { ...updated[existingIndex] };
        item.quantity += quantity;
        item.total_price = item.quantity * (item.unit_price + item.modifiers_price);
        updated[existingIndex] = item;
        set({ cart: updated });
        return;
      }
    }

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      variant_id: variant?.id,
      variant_name: variant?.name,
      quantity,
      unit_price: price,
      original_unit_price: originalUnitPrice,
      promotion_label: promotionLabel,
      modifiers,
      modifiers_price,
      total_price: quantity * (price + modifiers_price),
    };
    set({ cart: [...state.cart, newItem] });
  },

  removeFromCart: (itemId) => {
    set({ cart: get().cart.filter((item) => item.id !== itemId) });
  },

  updateCartItemQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }
    const updated = get().cart.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        quantity,
        total_price: quantity * (item.unit_price + item.modifiers_price),
      };
    });
    set({ cart: updated });
  },

  addModifierToCartItem: (itemId, modifier) => {
    const updated = get().cart.map((item) => {
      if (item.id !== itemId) return item;
      const modifiers = [...item.modifiers, modifier];
      const modifiers_price = modifiers.reduce(
        (sum, m) => sum + m.price * m.quantity,
        0
      );
      return {
        ...item,
        modifiers,
        modifiers_price,
        total_price: item.quantity * (item.unit_price + modifiers_price),
      };
    });
    set({ cart: updated });
  },

  removeModifierFromCartItem: (itemId, modifierId) => {
    const updated = get().cart.map((item) => {
      if (item.id !== itemId) return item;
      const modifiers = item.modifiers.filter(
        (m) => m.modifier_id !== modifierId
      );
      const modifiers_price = modifiers.reduce(
        (sum, m) => sum + m.price * m.quantity,
        0
      );
      return {
        ...item,
        modifiers,
        modifiers_price,
        total_price: item.quantity * (item.unit_price + modifiers_price),
      };
    });
    set({ cart: updated });
  },

  setCartCustomer: (name, phone) =>
    set({ cartCustomerName: name, cartCustomerPhone: phone }),

  setCartChannel: (channel) => set({ cartChannel: channel }),

  setCartSource: (source) => set({ cartSource: source }),

  setCartPaymentMethod: (method) => set({ cartPaymentMethod: method }),

  setCartNotes: (notes) => set({ cartNotes: notes }),

  clearCart: () =>
    set({
      cart: [],
      cartCustomerName: '',
      cartCustomerPhone: '',
      cartNotes: '',
      cartChannel: OrderChannel.POS,
      cartSource: OrderSource.TAKEAWAY,
      cartPaymentMethod: PaymentMethod.CASH,
    }),

  // Computed helpers
  cartTotal: () => {
    return get().cart.reduce((sum, item) => sum + item.total_price, 0);
  },

  cartItemCount: () => {
    return get().cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  filteredOrders: () => {
    const { orders, filterStatus } = get();
    if (filterStatus === 'all') return orders;
    return orders.filter((o) => o.status === filterStatus);
  },

  todaysRevenue: () => {
    return getOrderStatsForLocalDay(get().orders).revenueToday;
  },

  todaysOrderCount: () => {
    return getOrderStatsForLocalDay(get().orders).orderCountToday;
  },
}));
