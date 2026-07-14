import { api, buildQuery, type ListResponse } from '@shared/api';
import type { CreateUserInput, DeleteUserResponse, UpdateUserInput, User, UserListParams } from '../model';

export function listUsers(
  params: UserListParams,
  signal?: AbortSignal,
): Promise<ListResponse<User>> {
  return api.get<ListResponse<User>>(`/api/users/list${buildQuery(params)}`, { signal });
}

export function createUser(input: CreateUserInput): Promise<User> {
  return api.post<User>('/api/users/create', input);
}

export function updateUser(input: UpdateUserInput): Promise<User> {
  return api.put<User>('/api/users/update', input);
}

export function deleteUser(id: string): Promise<DeleteUserResponse> {
  return api.delete<DeleteUserResponse>('/api/users/delete', { id });
}
