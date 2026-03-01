'use client';

import { useEffect, useCallback } from 'react';
import { useOrdersStore } from './store';
import { ordersRepository } from './repository';

export function useOrders() {
  const {
    orders,
    isLoading,
    filterStatus,
    setFilterStatus,
    loadOrders,
    filteredOrders,
    todaysRevenue,
    todaysOrderCount,
  } = useOrdersStore();

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    isLoading,
    filterStatus,
    setFilterStatus,
    filteredOrders: filteredOrders(),
    todaysRevenue: todaysRevenue(),
    todaysOrderCount: todaysOrderCount(),
    refresh: loadOrders,
  };
}

export function useOrder(id: string) {
  const { selectedOrder, selectOrder } = useOrdersStore();

  useEffect(() => {
    let cancelled = false;
    ordersRepository.findById(id).then((order) => {
      if (!cancelled) {
        selectOrder(order);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, selectOrder]);

  const refresh = useCallback(() => {
    ordersRepository.findById(id).then((order) => {
      selectOrder(order);
    });
  }, [id, selectOrder]);

  return {
    order: selectedOrder,
    isLoading: !selectedOrder,
    refresh,
  };
}

export function useActiveOrders() {
  const { activeOrders, loadActiveOrders } = useOrdersStore();

  useEffect(() => {
    loadActiveOrders();
  }, [loadActiveOrders]);

  return {
    activeOrders,
    refresh: loadActiveOrders,
  };
}

export function useCart() {
  const {
    cart,
    cartCustomerName,
    cartCustomerPhone,
    cartChannel,
    cartSource,
    cartPaymentMethod,
    cartNotes,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    addModifierToCartItem,
    removeModifierFromCartItem,
    setCartCustomer,
    setCartChannel,
    setCartSource,
    setCartPaymentMethod,
    setCartNotes,
    clearCart,
    createOrder,
    cartTotal,
    cartItemCount,
  } = useOrdersStore();

  return {
    cart,
    customerName: cartCustomerName,
    customerPhone: cartCustomerPhone,
    channel: cartChannel,
    source: cartSource,
    paymentMethod: cartPaymentMethod,
    notes: cartNotes,
    total: cartTotal(),
    itemCount: cartItemCount(),
    addToCart,
    removeFromCart,
    updateQuantity: updateCartItemQuantity,
    addModifier: addModifierToCartItem,
    removeModifier: removeModifierFromCartItem,
    setCustomer: setCartCustomer,
    setChannel: setCartChannel,
    setSource: setCartSource,
    setPaymentMethod: setCartPaymentMethod,
    setNotes: setCartNotes,
    clearCart,
    createOrder,
  };
}
