import { UserRole } from './enums';
import { BaseEntity } from './common';

export interface User extends BaseEntity {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  pin?: string;
  location_id: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
