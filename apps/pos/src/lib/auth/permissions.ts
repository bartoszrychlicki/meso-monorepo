const USER_MANAGEMENT_ROLES = new Set(['admin', 'manager']);

export function canManageUsers(role: unknown): boolean {
  if (typeof role !== 'string') return false;
  return USER_MANAGEMENT_ROLES.has(role.trim().toLowerCase());
}
