import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type {
  Client,
  ClientListParams,
  CreateClientInput,
  DeleteClientResponse,
  UpdateClientInput,
} from '../model';
import { createClient, deleteClient, listClients, updateClient } from './clientsApi';

export const CLIENTS_QUERY_KEY = ['clients'] as const;

export function useClientsQuery(
  params: ClientListParams,
): UseQueryResult<ListResponse<Client>, Error> {
  return useQuery<ListResponse<Client>, Error>({
    queryKey: [...CLIENTS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listClients(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

/** Короткий список клиентов без пагинации UI — для select'ов (attendees, links). */
export function useAllClientsQuery(): UseQueryResult<ListResponse<Client>, Error> {
  return useQuery<ListResponse<Client>, Error>({
    queryKey: [...CLIENTS_QUERY_KEY, 'all'],
    queryFn: ({ signal }) =>
      listClients({ page: 1, page_size: 100, sort_by: 'created_at', order: 'desc' }, signal),
    staleTime: 30_000,
  });
}

export function useCreateClient(): UseMutationResult<Client, Error, CreateClientInput> {
  const qc = useQueryClient();
  return useMutation<Client, Error, CreateClientInput>({
    mutationFn: createClient,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    },
  });
}

export function useUpdateClient(): UseMutationResult<Client, Error, UpdateClientInput> {
  const qc = useQueryClient();
  return useMutation<Client, Error, UpdateClientInput>({
    mutationFn: updateClient,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    },
  });
}

export function useDeleteClient(): UseMutationResult<DeleteClientResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteClientResponse, Error, string>({
    mutationFn: deleteClient,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
    },
  });
}
