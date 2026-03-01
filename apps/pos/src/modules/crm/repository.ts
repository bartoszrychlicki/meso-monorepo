/**
 * CRM Repository
 *
 * Data access layer for customer, loyalty, and coupon management.
 */

import { createRepository } from '@/lib/data/repository-factory';
import { Customer, LoyaltyTransaction, Coupon } from '@/types/crm';
import { LoyaltyTier, RFMSegment } from '@/types/enums';
import { calculateTierFromPoints } from './utils/loyalty-calculator';

// Base repositories
const customersRepo = createRepository<Customer>('customers');
const loyaltyRepo = createRepository<LoyaltyTransaction>('loyalty_transactions');
const couponsRepo = createRepository<Coupon>('coupons');

/**
 * CRM Repository
 * Provides data access methods for CRM module
 */
export const crmRepository = {
  // Direct access to base repositories
  customers: customersRepo,
  loyaltyTransactions: loyaltyRepo,
  coupons: couponsRepo,

  /**
   * Find customer by phone number
   *
   * @param phone - Customer phone number
   * @returns Customer or null if not found
   */
  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const customers = await customersRepo.findMany(
      (c) => c.phone === phone && c.is_active
    );
    return customers[0] ?? null;
  },

  /**
   * Find customer by email
   *
   * @param email - Customer email address
   * @returns Customer or null if not found
   */
  async findCustomerByEmail(email: string): Promise<Customer | null> {
    const customers = await customersRepo.findMany(
      (c) => c.email === email && c.is_active
    );
    return customers[0] ?? null;
  },

  /**
   * Get customers by loyalty tier
   *
   * @param tier - Loyalty tier to filter by
   * @returns List of customers in the specified tier
   */
  async getCustomersByTier(tier: LoyaltyTier): Promise<Customer[]> {
    return customersRepo.findMany(
      (c) => c.loyalty_tier === tier && c.is_active
    );
  },

  /**
   * Get top spending customers
   *
   * @param limit - Maximum number of customers to return (default: 10)
   * @returns List of top spending customers
   */
  async getTopSpenders(limit = 10): Promise<Customer[]> {
    const customers = await customersRepo.findMany((c) => c.is_active);
    return customers
      .sort((a, b) => b.order_history.total_spent - a.order_history.total_spent)
      .slice(0, limit);
  },

  /**
   * Get customers with recent activity
   *
   * @param daysAgo - Number of days to look back (default: 30)
   * @returns List of customers with recent orders
   */
  async getRecentCustomers(daysAgo = 30): Promise<Customer[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    const customers = await customersRepo.findMany((c) => c.is_active);
    return customers
      .filter((c) => {
        const lastOrder = c.order_history.last_order_date;
        return lastOrder && new Date(lastOrder) >= cutoffDate;
      })
      .sort((a, b) => {
        const dateA = a.order_history.last_order_date ? new Date(a.order_history.last_order_date).getTime() : 0;
        const dateB = b.order_history.last_order_date ? new Date(b.order_history.last_order_date).getTime() : 0;
        return dateB - dateA;
      });
  },

  /**
   * Add loyalty transaction and update customer points
   *
   * This is a transactional operation that:
   * 1. Creates a loyalty transaction record
   * 2. Updates customer's total points
   * 3. Recalculates and updates customer's tier if needed
   *
   * @param data - Loyalty transaction data (without id and created_at)
   * @throws Error if customer not found
   */
  async addLoyaltyTransaction(
    data: Omit<LoyaltyTransaction, 'id' | 'created_at'>
  ): Promise<LoyaltyTransaction> {
    // Create transaction record
    const transaction = await loyaltyRepo.create({
      ...data,
    });

    // Update customer points
    const customer = await customersRepo.findById(data.customer_id);
    if (!customer) {
      throw new Error(`Customer not found: ${data.customer_id}`);
    }

    const newPoints = customer.loyalty_points + data.amount;
    const newTier = calculateTierFromPoints(newPoints);

    await customersRepo.update(customer.id, {
      loyalty_points: newPoints,
      loyalty_tier: newTier,
      updated_at: new Date().toISOString(),
    });

    return transaction;
  },

  /**
   * Update customer order statistics
   *
   * Called after an order is completed to update denormalized stats.
   *
   * @param customerId - Customer ID
   * @param stats - Updated order history statistics
   */
  async updateOrderStats(
    customerId: string,
    stats: Customer['order_history']
  ): Promise<void> {
    await customersRepo.update(customerId, {
      order_history: stats,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Get loyalty transaction history for a customer
   *
   * @param customerId - Customer ID
   * @returns List of loyalty transactions, sorted by date (newest first)
   */
  async getCustomerLoyaltyHistory(
    customerId: string
  ): Promise<LoyaltyTransaction[]> {
    const transactions = await loyaltyRepo.findMany(
      (t) => t.customer_id === customerId
    );
    return transactions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /**
   * Get customers with birthdays in the current month
   *
   * Used for birthday bonus campaigns.
   *
   * @returns List of customers with birthdays this month
   */
  async getCustomersWithBirthdayThisMonth(): Promise<Customer[]> {
    const now = new Date();
    const currentMonth = now.getMonth();

    const customers = await customersRepo.findMany((c) => c.is_active);
    return customers.filter((c) => {
      if (!c.birth_date) return false;
      const birthDate = new Date(c.birth_date);
      return birthDate.getMonth() === currentMonth;
    });
  },

  /**
   * Search customers by query string
   *
   * Searches in: first_name, last_name, email, phone
   *
   * @param query - Search query
   * @returns List of matching customers
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    const customers = await customersRepo.findMany((c) => c.is_active);

    return customers.filter(
      (c) =>
        c.first_name.toLowerCase().includes(lowerQuery) ||
        c.last_name.toLowerCase().includes(lowerQuery) ||
        c.email?.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(query)
    );
  },

  /**
   * Get customer statistics summary
   *
   * @returns Aggregated statistics
   */
  async getCustomerStats(): Promise<{
    total: number;
    bronze: number;
    silver: number;
    gold: number;
    withOrders: number;
    totalLoyaltyPoints: number;
    averageOrderValue: number;
  }> {
    const customers = await customersRepo.findMany((c) => c.is_active);

    const stats = {
      total: customers.length,
      bronze: customers.filter((c) => c.loyalty_tier === LoyaltyTier.BRONZE).length,
      silver: customers.filter((c) => c.loyalty_tier === LoyaltyTier.SILVER).length,
      gold: customers.filter((c) => c.loyalty_tier === LoyaltyTier.GOLD).length,
      withOrders: customers.filter((c) => c.order_history.total_orders > 0).length,
      totalLoyaltyPoints: customers.reduce((sum, c) => sum + c.loyalty_points, 0),
      averageOrderValue:
        customers.reduce((sum, c) => sum + c.order_history.average_order_value, 0) /
        (customers.length || 1),
    };

    return stats;
  },

  // Phase 2: RFM Segmentation (stub)
  /**
   * Segment customers by RFM analysis
   *
   * @returns Map of RFM segments to customer lists
   * @throws Error - Not yet implemented (Phase 2)
   */
  async segmentCustomersByRFM(): Promise<Map<RFMSegment, Customer[]>> {
    throw new Error('RFM segmentation not yet implemented (Phase 2)');
  },

  /**
   * Update RFM scores for a customer
   *
   * @param customerId - Customer ID
   * @param scores - RFM scores
   * @throws Error - Not yet implemented (Phase 2)
   */
  async updateCustomerRFMScores(
    customerId: string,
    scores: {
      recency: number;
      frequency: number;
      monetary: number;
      segment: RFMSegment;
    }
  ): Promise<void> {
    throw new Error('RFM scoring not yet implemented (Phase 2)');
  },
};

export default crmRepository;
