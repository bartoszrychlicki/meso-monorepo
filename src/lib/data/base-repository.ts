import { BaseEntity, PaginatedResult } from '@/types/common';

export interface QueryOptions {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export abstract class BaseRepository<T extends BaseEntity> {
  abstract findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  abstract findById(id: string): Promise<T | null>;
  abstract findMany(filter: Partial<T> | ((item: T) => boolean)): Promise<T[]>;
  abstract create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract count(filter?: Partial<T>): Promise<number>;
}
