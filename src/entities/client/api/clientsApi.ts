import { api, buildQuery, type ListResponse } from '@shared/api';
import type {
  Client,
  ClientListParams,
  CreateClientInput,
  DeleteClientResponse,
  UpdateClientInput,
} from '../model';

export function listClients(
  params: ClientListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Client>> {
  return api.get<ListResponse<Client>>(`/api/clients/list${buildQuery(params)}`, { signal });
}

export function createClient(input: CreateClientInput): Promise<Client> {
  return api.post<Client>('/api/clients/create', input);
}

export function updateClient(input: UpdateClientInput): Promise<Client> {
  return api.put<Client>('/api/clients/update', input);
}

export function deleteClient(id: string): Promise<DeleteClientResponse> {
  return api.delete<DeleteClientResponse>('/api/clients/delete', { id });
}
