import { BaseEntity } from '@/types/common';
import { BaseRepository } from './base-repository';
import { LocalStorageRepository } from './localStorage-backend';
import { SupabaseRepository } from './supabase-repository';

type BackendType = 'localStorage' | 'supabase';

function getBackendType(): BackendType {
  const env = typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_DATA_BACKEND
    : undefined;
  return (env as BackendType) || 'localStorage';
}

export function createRepository<T extends BaseEntity>(
  collectionName: string
): BaseRepository<T> & { bulkCreate?: (items: T[]) => Promise<void>; clear?: () => Promise<void> } {
  const backend = getBackendType();

  switch (backend) {
    case 'localStorage':
      return new LocalStorageRepository<T>(collectionName);
    case 'supabase':
      return new SupabaseRepository<T>(collectionName);
    default:
      return new LocalStorageRepository<T>(collectionName);
  }
}
