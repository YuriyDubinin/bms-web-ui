import { api, buildQuery, type ListResponse } from '@shared/api';
import type {
  CreateServiceInput,
  DeleteServiceResponse,
  Service,
  ServiceListParams,
  UpdateServiceInput,
} from '../model';

export function listServices(
  params: ServiceListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Service>> {
  return api.get<ListResponse<Service>>(`/api/services/list${buildQuery(params)}`, { signal });
}

export function createService(input: CreateServiceInput): Promise<Service> {
  return api.post<Service>('/api/services/create', input);
}

export function updateService(input: UpdateServiceInput): Promise<Service> {
  return api.put<Service>('/api/services/update', input);
}

export function deleteService(id: string): Promise<DeleteServiceResponse> {
  return api.delete<DeleteServiceResponse>('/api/services/delete', { id });
}
