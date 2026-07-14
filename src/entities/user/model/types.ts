import type { ListParams, Role, SortOrder } from '@shared/api';

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSortBy = 'created_at' | 'updated_at' | 'full_name' | 'email' | 'role';

export type UserListParams = Omit<ListParams, 'sort_by'> & {
  role?: Role;
  is_active?: boolean;
  sort_by?: UserSortBy;
  order?: SortOrder;
};

export type CreateUserInput = {
  email: string;
  full_name: string;
  role?: Role;
  password: string;
  is_active?: boolean;
};

export type UpdateUserInput = {
  id: string;
  email: string;
  full_name: string;
  role?: Role;
  /** Не слать → пароль не меняется. */
  password?: string;
  is_active?: boolean;
};

export type DeleteUserResponse = {
  id: string;
  deleted_at: string;
};
