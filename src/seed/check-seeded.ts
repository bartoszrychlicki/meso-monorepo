const SEED_FLAG_KEY = 'mesopos_seeded';
const SEED_VERSION_KEY = 'mesopos_seed_version';

/**
 * Bump this number whenever seed data changes to force a re-seed.
 */
export const SEED_VERSION = 2;

export function isSeeded(): boolean {
  if (typeof window === 'undefined') return true;
  const version = localStorage.getItem(SEED_VERSION_KEY);
  if (version && parseInt(version, 10) >= SEED_VERSION) return true;
  // Legacy flag without version — treat as outdated
  return false;
}

export function markAsSeeded(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEED_FLAG_KEY, 'true');
  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
}

export function clearSeedFlag(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEED_FLAG_KEY);
  localStorage.removeItem(SEED_VERSION_KEY);
}
