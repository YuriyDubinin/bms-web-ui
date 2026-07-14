import type { SortOrder } from '@shared/api';

export const SERVICE_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export type Service = {
  id: string;
  project_id: string | null;
  name: string;
  category?: string;
  description?: string;
  price: number | null;
  currency: string;
  duration_min: number | null;
  status: ServiceStatus;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ServiceSortBy = 'created_at' | 'updated_at' | 'name' | 'price' | 'status';

export type ServiceListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  status?: ServiceStatus;
  category?: string;
  search?: string;
  sort_by?: ServiceSortBy;
  order?: SortOrder;
};

export type CreateServiceInput = {
  project_id?: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  currency?: string;
  duration_min?: number;
  status?: ServiceStatus;
  attributes?: Record<string, unknown>;
};

export type UpdateServiceInput = CreateServiceInput & { id: string };

export type DeleteServiceResponse = {
  id: string;
  deleted_at: string;
};
