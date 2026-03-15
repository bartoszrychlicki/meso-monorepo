/**
 * CRM Store
 *
 * Zustand store for customer and loyalty management.
 */

import { create } from 'zustand';
import { Customer } from '@/types/crm';
import { LoyaltyTier } from '@/types/enums';
import { crmRepository } from './repository';
import { CreateCustomerInput, UpdateCustomerInput } from '@/schemas/crm';

interface CRMStore {
  // State
  customers: Customer[];
  selectedCustomerId: string | null;
  searchQuery: string;
  tierFilter: LoyaltyTier | 'all';
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCustomers: () => Promise<void>;
  createCustomer: (data: CreateCustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, data: UpdateCustomerInput) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  setSelectedCustomerId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTierFilter: (tier: LoyaltyTier | 'all') => void;
  clearError: () => void;

  // Computed
  getFilteredCustomers: () => Customer[];
  getCustomersByTier: () => Map<LoyaltyTier, Customer[]>;
  getSelectedCustomer: () => Customer | null;
  getCustomerStats: () => {
    total: number;
    bronze: number;
    silver: number;
    gold: number;
  };
}

/**
 * CRM Store
 * Manages customer and loyalty data
 */
export const useCRMStore = create<CRMStore>((set, get) => ({
  // Initial state
  customers: [],
  selectedCustomerId: null,
  searchQuery: '',
  tierFilter: 'all',
  isLoading: false,
  error: null,

  /**
   * Load all active customers
   */
  loadCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const customers = await crmRepository.customers.findMany(
        (c) => c.is_active
      );
      set({ customers, isLoading: false });
    } catch (error) {
      console.error('Failed to load customers:', error);
      set({
        error: 'Nie udało się załadować klientów',
        isLoading: false,
      });
    }
  },

  /**
   * Create a new customer
   *
   * @param data - Customer creation data
   * @returns Created customer
   */
  createCustomer: async (data: CreateCustomerInput) => {
    set({ isLoading: true, error: null });
    try {
      // Exclude addresses as they need metadata fields - handle separately if needed
      const { addresses: _addresses, ...customerData } = data;
      const customer = await crmRepository.customers.create({
        ...customerData,
        email: data.email ?? null,
        addresses: [], // Initialize empty, addresses should be added via separate method
        preferences: data.preferences ?? {},
        // Default values for new customer
        loyalty_points: 0,
        loyalty_tier: LoyaltyTier.BRONZE,
        rfm_segment: null,
        rfm_recency_score: null,
        rfm_frequency_score: null,
        rfm_monetary_score: null,
        rfm_last_calculated: null,
        registration_date: new Date().toISOString(),
        order_history: {
          total_orders: 0,
          total_spent: 0,
          average_order_value: 0,
          last_order_date: null,
          first_order_date: null,
        },
        is_active: true,
        birth_date: data.birth_date || null,
        notes: data.notes ?? null,
      });

      set({ customers: [...get().customers, customer], isLoading: false });
      return customer;
    } catch (error) {
      console.error('Failed to create customer:', error);
      set({
        error: 'Nie udało się utworzyć klienta',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Update an existing customer
   *
   * @param id - Customer ID
   * @param data - Update data
   */
  updateCustomer: async (id: string, data: UpdateCustomerInput) => {
    set({ isLoading: true, error: null });
    try {
      // Exclude addresses from update as they need metadata fields
      const { addresses: _addresses, ...updateData } = data;
      await crmRepository.customers.update(id, {
        ...updateData,
        updated_at: new Date().toISOString(),
      });
      await get().loadCustomers();
    } catch (error) {
      console.error('Failed to update customer:', error);
      set({
        error: 'Nie udało się zaktualizować klienta',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Soft delete a customer
   *
   * @param id - Customer ID
   */
  deleteCustomer: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await crmRepository.customers.update(id, {
        is_active: false,
        updated_at: new Date().toISOString(),
      });
      await get().loadCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      set({
        error: 'Nie udało się usunąć klienta',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Set selected customer ID
   *
   * @param id - Customer ID or null to clear selection
   */
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),

  /**
   * Set search query
   *
   * @param query - Search query string
   */
  setSearchQuery: (query) => set({ searchQuery: query }),

  /**
   * Set tier filter
   *
   * @param tier - Loyalty tier or 'all' for no filter
   */
  setTierFilter: (tier) => set({ tierFilter: tier }),

  /**
   * Clear error message
   */
  clearError: () => set({ error: null }),

  /**
   * Get filtered customers based on search and tier filter
   *
   * @returns Filtered and sorted customer list
   */
  getFilteredCustomers: () => {
    const { customers, searchQuery, tierFilter } = get();
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.first_name.toLowerCase().includes(query) ||
          c.last_name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone.includes(query)
      );
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((c) => c.loyalty_tier === tierFilter);
    }

    // Default list order: newest customers first.
    return filtered.sort((a, b) => {
      const dateA = new Date(a.registration_date).getTime();
      const dateB = new Date(b.registration_date).getTime();
      return dateB - dateA;
    });
  },

  /**
   * Get customers grouped by tier
   *
   * @returns Map of tier to customer list
   */
  getCustomersByTier: () => {
    const customers = get().customers;
    const byTier = new Map<LoyaltyTier, Customer[]>();

    Object.values(LoyaltyTier).forEach((tier) => {
      byTier.set(
        tier,
        customers.filter((c) => c.loyalty_tier === tier)
      );
    });

    return byTier;
  },

  /**
   * Get currently selected customer
   *
   * @returns Selected customer or null
   */
  getSelectedCustomer: () => {
    const { customers, selectedCustomerId } = get();
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) ?? null;
  },

  /**
   * Get customer statistics summary
   *
   * @returns Customer count by tier
   */
  getCustomerStats: () => {
    const customers = get().customers;
    return {
      total: customers.length,
      bronze: customers.filter((c) => c.loyalty_tier === LoyaltyTier.BRONZE).length,
      silver: customers.filter((c) => c.loyalty_tier === LoyaltyTier.SILVER).length,
      gold: customers.filter((c) => c.loyalty_tier === LoyaltyTier.GOLD).length,
    };
  },
}));

export default useCRMStore;
