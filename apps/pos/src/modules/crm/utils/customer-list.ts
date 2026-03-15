import type { Customer, TopOrderedProduct } from '@/types/crm';
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

function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getPhoneSortValue(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits || phone;
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
  const products = customer.order_history.top_ordered_products ?? [];
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

function compareByFavoriteDish(a: Customer, b: Customer): number {
  const productA = getCustomerFavoriteProduct(a);
  const productB = getCustomerFavoriteProduct(b);

  const countComparison = compareNullableNumbers(
    productA?.order_count ?? null,
    productB?.order_count ?? null
  );
  if (countComparison !== 0) return countComparison;

  return compareNullableStrings(
    productA?.product_name ?? null,
    productB?.product_name ?? null
  );
}

export function sortCustomers(customers: Customer[], sort: CustomerSort): Customer[] {
  return [...customers].sort((customerA, customerB) => {
    let comparison = 0;

    switch (sort.key) {
      case 'registration_date':
        comparison =
          toTimestamp(customerA.registration_date) -
          toTimestamp(customerB.registration_date);
        break;
      case 'total_spent':
        comparison =
          customerA.order_history.total_spent - customerB.order_history.total_spent;
        break;
      case 'favorite_dish':
        comparison = compareByFavoriteDish(customerA, customerB);
        break;
      case 'total_orders':
        comparison =
          customerA.order_history.total_orders - customerB.order_history.total_orders;
        break;
      case 'loyalty_points':
        comparison = customerA.loyalty_points - customerB.loyalty_points;
        break;
      case 'status':
        comparison =
          tierRank[customerA.loyalty_tier] - tierRank[customerB.loyalty_tier];
        break;
      case 'name':
        comparison = compareNullableStrings(
          getCustomerFullName(customerA),
          getCustomerFullName(customerB)
        );
        break;
      case 'phone':
        comparison = compareNullableStrings(
          getPhoneSortValue(customerA.phone),
          getPhoneSortValue(customerB.phone)
        );
        break;
    }

    if (comparison !== 0) {
      return sort.order === 'asc' ? comparison : -comparison;
    }

    return toTimestamp(customerB.registration_date) - toTimestamp(customerA.registration_date);
  });
}
