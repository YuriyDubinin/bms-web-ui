import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreateServerInput,
  DeleteServerResponse,
  Server,
  ServerConnectResult,
  ServerInstallKeyResult,
  ServerListParams,
  ServerListResponse,
  ServerPingResult,
  UpdateServerInput,
} from '../model';
import {
  connectServer,
  createServer,
  deleteServer,
  installServerKey,
  listServers,
  pingServer,
  updateServer,
} from './serversApi';

export const SERVERS_QUERY_KEY = ['servers'] as const;

export function useServersQuery(
  params: ServerListParams,
): UseQueryResult<ServerListResponse, Error> {
  return useQuery<ServerListResponse, Error>({
    queryKey: [...SERVERS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listServers(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateServer(): UseMutationResult<Server, Error, CreateServerInput> {
  const qc = useQueryClient();
  return useMutation<Server, Error, CreateServerInput>({
    mutationFn: createServer,
    meta: { silent: true }, // ошибки показываем в форме (по code/details)
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}

export function useUpdateServer(): UseMutationResult<Server, Error, UpdateServerInput> {
  const qc = useQueryClient();
  return useMutation<Server, Error, UpdateServerInput>({
    mutationFn: updateServer,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}

export function useDeleteServer(): UseMutationResult<DeleteServerResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteServerResponse, Error, string>({
    mutationFn: deleteServer,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}

export function useConnectServer(): UseMutationResult<ServerConnectResult, Error, string> {
  const qc = useQueryClient();
  return useMutation<ServerConnectResult, Error, string>({
    mutationFn: connectServer,
    meta: { silent: true }, // результат интерпретируем сами по connected/status
    onSuccess: () => {
      // connect пишет факты (os/cpu/…) и last_status — обновляем список.
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}

export function usePingServer(): UseMutationResult<ServerPingResult, Error, string> {
  const qc = useQueryClient();
  return useMutation<ServerPingResult, Error, string>({
    mutationFn: pingServer,
    meta: { silent: true },
    onSuccess: () => {
      // ping переключает is_active в обе стороны — обновляем список.
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}

export function useInstallServerKey(): UseMutationResult<ServerInstallKeyResult, Error, string> {
  const qc = useQueryClient();
  return useMutation<ServerInstallKeyResult, Error, string>({
    mutationFn: installServerKey,
    meta: { silent: true }, // успех/провал интерпретируем сами через describeServerInstallKey
    onSuccess: () => {
      // install-key пишет last_status / ssh_key_installed даже при провалах (200 OK) —
      // обновляем список, чтобы UI сразу увидел актуальные флаги.
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}
