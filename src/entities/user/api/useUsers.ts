import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type { CreateUserInput, DeleteUserResponse, UpdateUserInput, User, UserListParams } from '../model';
import { createUser, deleteUser, listUsers, updateUser } from './usersApi';

export const USERS_QUERY_KEY = ['users'] as const;

export function useUsersQuery(params: UserListParams): UseQueryResult<ListResponse<User>, Error> {
  return useQuery<ListResponse<User>, Error>({
    queryKey: [...USERS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listUsers(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

/** Короткий список активных операторов — для select'ов назначения (tasks/attendees). */
export function useAllUsersQuery(): UseQueryResult<ListResponse<User>, Error> {
  return useQuery<ListResponse<User>, Error>({
    queryKey: [...USERS_QUERY_KEY, 'all'],
    queryFn: ({ signal }) =>
      listUsers({ page: 1, page_size: 100, is_active: true, sort_by: 'full_name', order: 'asc' }, signal),
    staleTime: 60_000,
  });
}

export function useCreateUser(): UseMutationResult<User, Error, CreateUserInput> {
  const qc = useQueryClient();
  return useMutation<User, Error, CreateUserInput>({
    mutationFn: createUser,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateUser(): UseMutationResult<User, Error, UpdateUserInput> {
  const qc = useQueryClient();
  return useMutation<User, Error, UpdateUserInput>({
    mutationFn: updateUser,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useDeleteUser(): UseMutationResult<DeleteUserResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteUserResponse, Error, string>({
    mutationFn: deleteUser,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
