import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test that the factory returns the correct backend based on env var
// Mock both backends
vi.mock('../localStorage-backend', () => ({
  LocalStorageRepository: vi.fn().mockImplementation((name: string) => ({
    type: 'localStorage',
    collectionName: name,
  })),
}));

vi.mock('../supabase-repository', () => ({
  SupabaseRepository: vi.fn().mockImplementation((name: string) => ({
    type: 'supabase',
    collectionName: name,
  })),
}));

describe('createRepository', () => {
  const originalEnv = process.env.NEXT_PUBLIC_DATA_BACKEND;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_DATA_BACKEND;
    } else {
      process.env.NEXT_PUBLIC_DATA_BACKEND = originalEnv;
    }
    vi.resetModules();
  });

  it('returns LocalStorageRepository by default', async () => {
    delete process.env.NEXT_PUBLIC_DATA_BACKEND;
    const { createRepository } = await import('../repository-factory');
    const repo = createRepository('stock_items');
    expect((repo as unknown as { type: string }).type).toBe('localStorage');
  });

  it('returns LocalStorageRepository when env is localStorage', async () => {
    process.env.NEXT_PUBLIC_DATA_BACKEND = 'localStorage';
    const { createRepository } = await import('../repository-factory');
    const repo = createRepository('stock_items');
    expect((repo as unknown as { type: string }).type).toBe('localStorage');
  });

  it('returns SupabaseRepository when env is supabase', async () => {
    process.env.NEXT_PUBLIC_DATA_BACKEND = 'supabase';
    const { createRepository } = await import('../repository-factory');
    const repo = createRepository('stock_items');
    expect((repo as unknown as { type: string }).type).toBe('supabase');
  });

  it('passes collection name to repository constructor', async () => {
    delete process.env.NEXT_PUBLIC_DATA_BACKEND;
    const { createRepository } = await import('../repository-factory');
    const repo = createRepository('orders');
    expect((repo as unknown as { collectionName: string }).collectionName).toBe('orders');
  });
});
