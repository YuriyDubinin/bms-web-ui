import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreateRegistryInput,
  DeleteRegistryResponse,
  Registry,
  RegistryConnectResult,
  RegistryImagesResponse,
  RegistryListParams,
  RegistryListResponse,
  RegistryPingResult,
  UpdateRegistryInput,
} from '../model';
import {
  connectRegistry,
  createRegistry,
  deleteRegistry,
  getRegistryImages,
  listRegistries,
  pingRegistry,
  updateRegistry,
} from './registriesApi';

export const REGISTRIES_QUERY_KEY = ['registries'] as const;

export function useRegistriesQuery(
  params: RegistryListParams,
): UseQueryResult<RegistryListResponse, Error> {
  return useQuery<RegistryListResponse, Error>({
    queryKey: [...REGISTRIES_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listRegistries(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateRegistry(): UseMutationResult<Registry, Error, CreateRegistryInput> {
  const qc = useQueryClient();
  return useMutation<Registry, Error, CreateRegistryInput>({
    mutationFn: createRegistry,
    meta: { silent: true }, // ошибки показываем в форме (по code/details)
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REGISTRIES_QUERY_KEY });
    },
  });
}

export function useUpdateRegistry(): UseMutationResult<Registry, Error, UpdateRegistryInput> {
  const qc = useQueryClient();
  return useMutation<Registry, Error, UpdateRegistryInput>({
    mutationFn: updateRegistry,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REGISTRIES_QUERY_KEY });
    },
  });
}

export function useDeleteRegistry(): UseMutationResult<DeleteRegistryResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteRegistryResponse, Error, string>({
    mutationFn: deleteRegistry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REGISTRIES_QUERY_KEY });
    },
  });
}

export function useConnectRegistry(): UseMutationResult<RegistryConnectResult, Error, string> {
  const qc = useQueryClient();
  return useMutation<RegistryConnectResult, Error, string>({
    mutationFn: connectRegistry,
    meta: { silent: true }, // результат интерпретируем сами по connected/status
    onSuccess: () => {
      // connect меняет is_active/last_status — обновляем список.
      void qc.invalidateQueries({ queryKey: REGISTRIES_QUERY_KEY });
    },
  });
}

export function usePingRegistry(): UseMutationResult<RegistryPingResult, Error, string> {
  const qc = useQueryClient();
  return useMutation<RegistryPingResult, Error, string>({
    mutationFn: pingRegistry,
    meta: { silent: true },
    onSuccess: () => {
      // ping переключает is_active в обе стороны — обновляем список.
      void qc.invalidateQueries({ queryKey: REGISTRIES_QUERY_KEY });
    },
  });
}

export function useRegistryImagesQuery(
  id: string,
  enabled: boolean,
): UseQueryResult<RegistryImagesResponse, Error> {
  return useQuery<RegistryImagesResponse, Error>({
    queryKey: [...REGISTRIES_QUERY_KEY, 'images', id],
    queryFn: ({ signal }) => getRegistryImages({ id }, signal),
    enabled,
    staleTime: 30_000,
    retry: false,
    meta: { silent: true }, // ошибки показываем в диалоге
  });
}
