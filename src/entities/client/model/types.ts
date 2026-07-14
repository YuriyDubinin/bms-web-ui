import type { SortOrder } from '@shared/api';

export const CLIENT_STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export type Client = {
  id: string;
  project_id: string | null;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  source?: string;
  address: Record<string, unknown> | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ClientSortBy = 'created_at' | 'updated_at' | 'first_name' | 'last_name' | 'company_name';

export type ClientListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  status?: ClientStatus;
  search?: string;
  sort_by?: ClientSortBy;
  order?: SortOrder;
};

export type CreateClientInput = {
  project_id?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  status?: ClientStatus;
  source?: string;
  address?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
};

export type UpdateClientInput = CreateClientInput & { id: string };

export type DeleteClientResponse = {
  id: string;
  deleted_at: string;
};
