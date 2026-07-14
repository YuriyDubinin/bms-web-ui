import type { Role } from '@shared/api';

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};
