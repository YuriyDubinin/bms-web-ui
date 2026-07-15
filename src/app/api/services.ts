import { api } from './client';
import type { Paginated, SortOrder } from './projects';

export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/** Модель услуги (ответ API). */
export type Service = {
  id: string;
  /** «Домашний» проект-направление; null, если услуга не привязана к проекту. */
  project_id: string | null;
  name: string;
  /** Категория (свободный текст); '' если не задана. */
  category: string;
  /** Описание; '' если не задано. */
  description: string;
  /** Цена NUMERIC(12,2); null если не задана. */
  price: number | null;
  /** Валюта, ISO-код из 3 букв в верхнем регистре (RUB, USD, EUR). */
  currency: string;
  /** Длительность в минутах; null если не задана. */
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
  /** Только услуги этого проекта. */
  project_id?: string;
  status?: ServiceStatus;
  /** Точное совпадение категории. */
  category?: string;
  /** Подстрока по названию. */
  search?: string;
  sort_by?: ServiceSortBy;
  order?: SortOrder;
};

/**
 * Тело create/update услуги. При update действует PUT-семантика (полная замена):
 * поля, которые не переданы, сбрасываются на сервере (category/description → '',
 * price/duration_min → null, project_id → null, status → ACTIVE, currency → USD).
 * Поэтому форма всегда отправляет все поля целиком.
 */
export type ServiceInput = {
  name: string;
  project_id?: string | null;
  category?: string;
  description?: string;
  price?: number | null;
  currency?: string;
  duration_min?: number | null;
  status?: ServiceStatus;
  attributes?: Record<string, unknown>;
};

export type UpdateServiceInput = ServiceInput & { id: string };

export type DeleteServiceResponse = { id: string; deleted_at: string };

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listServices(
  token: string,
  params: ServiceListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Service>> {
  const query = buildQuery({
    page: params.page,
    page_size: params.page_size,
    project_id: params.project_id,
    status: params.status,
    category: params.category,
    search: params.search,
    sort_by: params.sort_by,
    order: params.order,
  });
  return api.get<Paginated<Service>>(`/services/list${query}`, { token, signal });
}

export function createService(token: string, input: ServiceInput): Promise<Service> {
  return api.post<Service>('/services/create', input, { token });
}

export function updateService(token: string, input: UpdateServiceInput): Promise<Service> {
  return api.put<Service>('/services/update', input, { token });
}

export function deleteService(token: string, id: string): Promise<DeleteServiceResponse> {
  return api.delete<DeleteServiceResponse>('/services/delete', { id }, { token });
}
