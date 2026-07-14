import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type {
  CreateServiceInput,
  DeleteServiceResponse,
  Service,
  ServiceListParams,
  UpdateServiceInput,
} from '../model';
import { createService, deleteService, listServices, updateService } from './servicesApi';

export const SERVICES_QUERY_KEY = ['services'] as const;

export function useServicesQuery(
  params: ServiceListParams,
): UseQueryResult<ListResponse<Service>, Error> {
  return useQuery<ListResponse<Service>, Error>({
    queryKey: [...SERVICES_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listServices(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateService(): UseMutationResult<Service, Error, CreateServiceInput> {
  const qc = useQueryClient();
  return useMutation<Service, Error, CreateServiceInput>({
    mutationFn: createService,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useUpdateService(): UseMutationResult<Service, Error, UpdateServiceInput> {
  const qc = useQueryClient();
  return useMutation<Service, Error, UpdateServiceInput>({
    mutationFn: updateService,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}

export function useDeleteService(): UseMutationResult<DeleteServiceResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteServiceResponse, Error, string>({
    mutationFn: deleteService,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
