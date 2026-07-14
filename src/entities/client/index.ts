export {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  useClientsQuery,
  useAllClientsQuery,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  CLIENTS_QUERY_KEY,
} from './api';
export {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONES,
  CLIENT_STATUS_OPTIONS,
  clientDisplayName,
  clientInitials,
} from './model';
export type {
  Client,
  ClientStatus,
  ClientSortBy,
  ClientListParams,
  CreateClientInput,
  UpdateClientInput,
  DeleteClientResponse,
} from './model';
