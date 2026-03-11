import { BaseEntity, PaginatedResult } from '@/types/common';
import { BaseRepository, QueryOptions } from './base-repository';
import { supabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE_MAP: Record<string, string> = {
  locations: 'users_locations',
  users: 'users_users',
  categories: 'menu_categories',
  products: 'menu_products',
  modifier_groups: 'menu_modifier_groups',
  modifiers: 'menu_modifiers',
  product_modifiers: 'product_modifiers',
  orders: 'orders_orders',
  kitchen_tickets: 'orders_kitchen_tickets',
  customers: 'crm_customers',
  customer_addresses: 'crm_customer_addresses',
  loyalty_transactions: 'crm_loyalty_transactions',
  coupons: 'crm_coupons',
  recipes: 'recipes_recipes',
  recipe_versions: 'recipes_recipe_versions',
  ingredient_usage_logs: 'recipes_ingredient_usage_logs',
  stock_items: 'inventory_stock_items',
  inventory_categories: 'inventory_categories',
  warehouses: 'inventory_warehouses',
  warehouse_stock: 'inventory_warehouse_stock',
  stock_item_components: 'inventory_stock_item_components',
  employees: 'employees_employees',
  work_times: 'employees_work_times',
  api_keys: 'integrations_api_keys',
  webhook_subscriptions: 'integrations_webhook_subscriptions',
  posbistro_orders: 'integrations_posbistro_orders',
};

// Fields that Postgres returns as strings (NUMERIC type) but TS expects as numbers
const NUMERIC_FIELDS = new Set([
  'price', 'original_price', 'subtotal', 'tax', 'discount', 'total',
  'quantity', 'min_quantity', 'cost_per_unit',
  'purchase_unit_weight_kg', 'supplier_quantity_received', 'price_per_kg_net',
  'hourly_rate', 'overtime_rate',
  'yield_quantity', 'total_cost', 'food_cost_percentage',
  'discount_value', 'minimum_order_value',
  'amount', 'multiplier', 'tax_rate', 'quantity_produced',
  'default_min_quantity', 'shelf_life_days',
]);

const READ_RETRY_ATTEMPTS = 2;
const READ_RETRY_DELAY_MS = 120;

export class SupabaseRepository<T extends BaseEntity> extends BaseRepository<T> {
  private collectionName: string;
  private client: SupabaseClient;

  constructor(collectionName: string, client?: SupabaseClient) {
    super();
    this.collectionName = collectionName;
    this.client = client ?? supabase;
  }

  private getTableName(): string {
    return TABLE_MAP[this.collectionName] ?? this.collectionName;
  }

  private transformRow(row: Record<string, unknown>): T {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (NUMERIC_FIELDS.has(key) && typeof value === 'string') {
        transformed[key] = Number(value);
      } else if (
        (key === 'created_at' || key === 'updated_at') &&
        value !== null &&
        value !== undefined &&
        typeof value !== 'string'
      ) {
        transformed[key] = String(value);
      } else {
        transformed[key] = value;
      }
    }
    return transformed as T;
  }

  private isRetryableReadError(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('load failed') ||
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('network request failed') ||
      normalized.includes('fetch failed');
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeReadQuery<R>(
    operation: string,
    table: string,
    run: () => Promise<{ data: R; error: { message: string } | null }>
  ): Promise<R> {
    let lastErrorMessage = 'Unknown error';

    for (let attempt = 1; attempt <= READ_RETRY_ATTEMPTS; attempt++) {
      const { data, error } = await run();

      if (!error) {
        return data;
      }

      lastErrorMessage = error.message;
      const shouldRetry = this.isRetryableReadError(error.message) && attempt < READ_RETRY_ATTEMPTS;
      if (!shouldRetry) break;

      await this.sleep(READ_RETRY_DELAY_MS * attempt);
    }

    throw new Error(`[${table}] ${operation} failed: ${lastErrorMessage}`);
  }

  async findAll(options?: QueryOptions): Promise<PaginatedResult<T>> {
    const table = this.getTableName();
    const page = options?.page ?? 1;
    const perPage = options?.per_page ?? 50;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count } = await this.executeReadQuery('findAll', table, async () => {
      let query = this.client.from(table).select('*', { count: 'exact' });

      // Apply filters
      if (options?.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value === undefined || value === null) continue;
          if (typeof value === 'string') {
            query = query.ilike(key, `%${value}%`);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      // Apply sorting
      if (options?.sort_by) {
        query = query.order(options.sort_by, {
          ascending: options.sort_order !== 'desc',
        });
      }

      // Apply pagination
      return query.range(from, to);
    });

    const rows = (data ?? []).map((row: Record<string, unknown>) =>
      this.transformRow(row)
    );
    const total = count ?? 0;
    const totalPages = Math.ceil(total / perPage);

    return {
      data: rows,
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
    };
  }

  async findById(id: string): Promise<T | null> {
    const table = this.getTableName();

    const data = await this.executeReadQuery('findById', table, async () => {
      return this.client
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
    });

    if (!data) return null;
    return this.transformRow(data as Record<string, unknown>);
  }

  async findMany(filter: Partial<T> | ((item: T) => boolean)): Promise<T[]> {
    const table = this.getTableName();

    if (typeof filter === 'function') {
      // Function filter: fetch all rows, then filter in JS
      const data = await this.executeReadQuery('findMany', table, async () => {
        return this.client.from(table).select('*');
      });

      const rows = (data ?? []).map((row: Record<string, unknown>) =>
        this.transformRow(row)
      );
      return rows.filter(filter);
    }

    // Object filter: build .eq() chains
    const data = await this.executeReadQuery('findMany', table, async () => {
      let query = this.client.from(table).select('*');

      for (const [key, value] of Object.entries(filter)) {
        if (value === undefined || value === null) continue;
        query = query.eq(key, value);
      }

      return query;
    });

    return (data ?? []).map((row: Record<string, unknown>) =>
      this.transformRow(row)
    );
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const table = this.getTableName();

    const { data: row, error } = await this.client
      .from(table)
      .insert(data as Record<string, unknown>)
      .select('*')
      .single();

    if (error) {
      throw new Error(`[${table}] create failed: ${error.message}`);
    }

    return this.transformRow(row as Record<string, unknown>);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const table = this.getTableName();

    const { data: row, error } = await this.client
      .from(table)
      .update({
        ...(data as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`[${table}] update failed: ${error.message}`);
    }

    return this.transformRow(row as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    const table = this.getTableName();

    const { error } = await this.client.from(table).delete().eq('id', id);

    if (error) {
      throw new Error(`[${table}] delete failed: ${error.message}`);
    }
  }

  async count(filter?: Partial<T>): Promise<number> {
    const table = this.getTableName();

    let query = this.client.from(table).select('id', { count: 'exact', head: true });

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value === undefined || value === null) continue;
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`[${table}] count failed: ${error.message}`);
    }

    return count ?? 0;
  }

  // Utility: bulk insert (used by seed)
  async bulkCreate(items: T[]): Promise<void> {
    const table = this.getTableName();

    const { error } = await this.client
      .from(table)
      .insert(items as unknown as Record<string, unknown>[]);

    if (error) {
      throw new Error(`[${table}] bulkCreate failed: ${error.message}`);
    }
  }

  // Utility: clear all rows from table
  async clear(): Promise<void> {
    const table = this.getTableName();

    // Supabase requires a filter for delete; use neq on id to match all rows
    const { error } = await this.client
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      throw new Error(`[${table}] clear failed: ${error.message}`);
    }
  }
}
