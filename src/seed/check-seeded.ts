const SEED_FLAG_KEY = 'mesopos_seeded';

export function isSeeded(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SEED_FLAG_KEY) === 'true';
}

export function markAsSeeded(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEED_FLAG_KEY, 'true');
}

export function clearSeedFlag(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEED_FLAG_KEY);
}
