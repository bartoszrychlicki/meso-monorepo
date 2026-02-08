import { BaseEntity } from './common';

export interface ApiKey extends BaseEntity {
  name: string;
  key_prefix: string; // first 8 chars for display (e.g., "meso_k1_")
  key_hash: string; // SHA-256 hash of the full key
  permissions: ApiKeyPermission[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_by: string;
}

export type ApiKeyPermission =
  | 'menu:read'
  | 'menu:write'
  | 'orders:read'
  | 'orders:write'
  | 'orders:status';

export const ALL_API_KEY_PERMISSIONS: ApiKeyPermission[] = [
  'menu:read',
  'menu:write',
  'orders:read',
  'orders:write',
  'orders:status',
];

export const API_KEY_PERMISSION_LABELS: Record<ApiKeyPermission, string> = {
  'menu:read': 'Menu - odczyt',
  'menu:write': 'Menu - zapis',
  'orders:read': 'Zamówienia - odczyt',
  'orders:write': 'Zamówienia - zapis',
  'orders:status': 'Zamówienia - zmiana statusu',
};
