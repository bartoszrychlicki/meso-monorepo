import { BaseEntity } from '@/types/common';
import { BaseRepository } from './base-repository';
import { LocalStorageRepository } from './localStorage-backend';
import { SupabaseRepository } from './supabase-repository';
import { createServiceClient } from '@/lib/supabase/server';

type BackendType = 'localStorage' | 'supabase';

function getBackendType(): BackendType {
  const env = typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_DATA_BACKEND
    : undefined;
  return (env as BackendType) || 'localStorage';
}

/**
 * Create a repository that uses the Supabase service role client.
 * Bypasses RLS — use only in server-side API routes.
 *
 * This is in a separate file from repository-factory.ts to avoid
 * pulling next/headers into client component bundles.
 */
export function createServerRepository<T extends BaseEntity>(
  collectionName: string
): BaseRepository<T> & { bulkCreate?: (items: T[]) => Promise<void>; clear?: () => Promise<void> } {
  const backend = getBackendType();

  if (backend !== 'supabase') {
    return new LocalStorageRepository<T>(collectionName);
  }

  return new SupabaseRepository<T>(collectionName, createServiceClient());
}
