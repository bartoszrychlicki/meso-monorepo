import type { Customer, CustomerOrderHistory, TopOrderedProduct } from '@/types/crm';
import { LoyaltyTier } from '@/types/enums';

export type CustomerSortKey =
  | 'registration_date'
  | 'total_spent'
  | 'favorite_dish'
  | 'total_orders'
  | 'loyalty_points'
  | 'status'
  | 'name'
  | 'phone';

export type CustomerSortOrder = 'asc' | 'desc';

export interface CustomerSort {
  key: CustomerSortKey;
  order: CustomerSortOrder;
}

export const DEFAULT_CUSTOMER_SORT: CustomerSort = {
  key: 'registration_date',
  order: 'desc',
};

const tierRank: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]: 0,
  [LoyaltyTier.SILVER]: 1,
  [LoyaltyTier.GOLD]: 2,
};

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareNullableStrings(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, 'pl', { sensitivity: 'base' });
}

function applySortOrder(
  comparison: number,
  order: CustomerSortOrder
): number {
  return order === 'asc' ? comparison : -comparison;
}

function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getPhoneSortValue(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits || phone;
}

function toFiniteNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getCustomerOrderHistory(customer: Customer): CustomerOrderHistory {
  const orderHistory = customer.order_history as Partial<CustomerOrderHistory> | undefined;

  return {
    total_orders: toFiniteNumber(orderHistory?.total_orders),
    total_spent: toFiniteNumber(orderHistory?.total_spent),
    average_order_value: toFiniteNumber(orderHistory?.average_order_value),
    last_order_date: orderHistory?.last_order_date ?? null,
    first_order_date: orderHistory?.first_order_date ?? null,
    top_ordered_products: Array.isArray(orderHistory?.top_ordered_products)
      ? orderHistory.top_ordered_products
      : [],
  };
}

export function getDefaultCustomerSortOrder(key: CustomerSortKey): CustomerSortOrder {
  switch (key) {
    case 'registration_date':
    case 'total_spent':
    case 'total_orders':
    case 'loyalty_points':
    case 'status':
      return 'desc';
    case 'favorite_dish':
    case 'name':
    case 'phone':
      return 'asc';
  }
}

export function getCustomerFullName(customer: Customer): string {
  return `${customer.first_name} ${customer.last_name}`.trim();
}

export function getCustomerFavoriteProduct(customer: Customer): TopOrderedProduct | null {
  const products = getCustomerOrderHistory(customer).top_ordered_products ?? [];
  if (products.length === 0) return null;

  return products.reduce<TopOrderedProduct | null>((topProduct, currentProduct) => {
    if (!topProduct) return currentProduct;
    if (currentProduct.order_count !== topProduct.order_count) {
      return currentProduct.order_count > topProduct.order_count
        ? currentProduct
        : topProduct;
    }

    return currentProduct.product_name.localeCompare(topProduct.product_name, 'pl', {
      sensitivity: 'base',
    }) < 0
      ? currentProduct
      : topProduct;
  }, null);
}

function compareByFavoriteDish(
  a: Customer,
  b: Customer,
  order: CustomerSortOrder
): number {
  const productA = getCustomerFavoriteProduct(a);
  const productB = getCustomerFavoriteProduct(b);

  if (!productA && !productB) return 0;
  if (!productA) return 1;
  if (!productB) return -1;

  const countComparison = compareNullableNumbers(productA.order_count, productB.order_count);
  if (countComparison !== 0) return applySortOrder(countComparison, order);

  return applySortOrder(
    compareNullableStrings(productA.product_name, productB.product_name),
    order
  );
}

export function sortCustomers(customers: Customer[], sort: CustomerSort): Customer[] {
  return [...customers].sort((customerA, customerB) => {
    let comparison = 0;
    const orderHistoryA = getCustomerOrderHistory(customerA);
    const orderHistoryB = getCustomerOrderHistory(customerB);

    switch (sort.key) {
      case 'registration_date':
        comparison = applySortOrder(
          toTimestamp(customerA.registration_date) -
            toTimestamp(customerB.registration_date),
          sort.order
        );
        break;
      case 'total_spent':
        comparison = applySortOrder(
          orderHistoryA.total_spent - orderHistoryB.total_spent,
          sort.order
        );
        break;
      case 'favorite_dish':
        comparison = compareByFavoriteDish(customerA, customerB, sort.order);
        break;
      case 'total_orders':
        comparison = applySortOrder(
          orderHistoryA.total_orders - orderHistoryB.total_orders,
          sort.order
        );
        break;
      case 'loyalty_points':
        comparison = applySortOrder(
          customerA.loyalty_points - customerB.loyalty_points,
          sort.order
        );
        break;
      case 'status':
        comparison = applySortOrder(
          tierRank[customerA.loyalty_tier] - tierRank[customerB.loyalty_tier],
          sort.order
        );
        break;
      case 'name':
        comparison = applySortOrder(
          compareNullableStrings(
            getCustomerFullName(customerA),
            getCustomerFullName(customerB)
          ),
          sort.order
        );
        break;
      case 'phone':
        comparison = applySortOrder(
          compareNullableStrings(
            getPhoneSortValue(customerA.phone),
            getPhoneSortValue(customerB.phone)
          ),
          sort.order
        );
        break;
    }

    if (comparison !== 0) return comparison;

    return toTimestamp(customerB.registration_date) - toTimestamp(customerA.registration_date);
  });
}
