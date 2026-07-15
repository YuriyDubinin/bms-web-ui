import { api } from './client';
import type { Paginated } from './projects';
import type { Role } from './auth';

/** Оператор организации (customer_users) — исполнитель/автор задач. */
export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserListParams = {
  page?: number;
  page_size?: number;
};

/** Список операторов организации — для селекта исполнителя задач и резолва имён. */
export function listUsers(
  token: string,
  params: UserListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<User>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.page_size) qs.set('page_size', String(params.page_size));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<Paginated<User>>(`/users/list${query}`, { token, signal });
}
