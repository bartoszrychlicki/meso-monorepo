import { BaseEntity, PaginatedResult } from '@/types/common';
import { BaseRepository, QueryOptions } from './base-repository';

const STORAGE_PREFIX = 'mesopos_';

export class LocalStorageRepository<T extends BaseEntity> extends BaseRepository<T> {
  private collectionName: string;
  private storageKey: string;

  constructor(collectionName: string) {
    super();
    this.collectionName = collectionName;
    this.storageKey = `${STORAGE_PREFIX}${collectionName}`;
  }

  private getAll(): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveAll(items: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private matchesFilter(item: T, filter: Partial<T>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const itemValue = (item as Record<string, unknown>)[key];
      if (value === undefined || value === null) return true;
      return itemValue === value;
    });
  }

  private sortItems(items: T[], sortBy?: string, sortOrder?: 'asc' | 'desc'): T[] {
    if (!sortBy) return items;
    return [...items].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  async findAll(options?: QueryOptions): Promise<PaginatedResult<T>> {
    let items = this.getAll();
    const page = options?.page ?? 1;
    const perPage = options?.per_page ?? 50;

    // Apply filters
    if (options?.filters) {
      items = items.filter((item) =>
        Object.entries(options.filters!).every(([key, value]) => {
          if (value === undefined || value === null) return true;
          const itemValue = (item as Record<string, unknown>)[key];
          if (typeof value === 'string' && typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        })
      );
    }

    // Sort
    items = this.sortItems(items, options?.sort_by, options?.sort_order);

    const total = items.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const data = items.slice(start, start + perPage);

    return {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
    };
  }

  async findById(id: string): Promise<T | null> {
    const items = this.getAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async findMany(filter: Partial<T> | ((item: T) => boolean)): Promise<T[]> {
    const items = this.getAll();
    if (typeof filter === 'function') {
      return items.filter(filter);
    }
    return items.filter((item) => this.matchesFilter(item, filter));
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const items = this.getAll();
    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    } as T;
    items.push(newItem);
    this.saveAll(items);
    return newItem;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const items = this.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`${this.collectionName}: Item with id ${id} not found`);
    }
    const updatedItem = {
      ...items[index],
      ...data,
      id, // prevent id override
      updated_at: new Date().toISOString(),
    };
    items[index] = updatedItem;
    this.saveAll(items);
    return updatedItem;
  }

  async delete(id: string): Promise<void> {
    const items = this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) {
      throw new Error(`${this.collectionName}: Item with id ${id} not found`);
    }
    this.saveAll(filtered);
  }

  async count(filter?: Partial<T>): Promise<number> {
    const items = this.getAll();
    if (!filter) return items.length;
    return items.filter((item) => this.matchesFilter(item, filter)).length;
  }

  // Utility: bulk insert (used by seed)
  async bulkCreate(items: T[]): Promise<void> {
    const existing = this.getAll();
    this.saveAll([...existing, ...items]);
  }

  // Utility: clear collection
  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
  }
}
