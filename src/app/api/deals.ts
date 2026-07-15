import { api } from './client';
import type { Paginated, SortOrder } from './projects';

export type DealStatus = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

/** Модель сделки (ответ API). */
export type Deal = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  title: string;
  /** Описание; '' если не задано. */
  description: string;
  status: DealStatus;
  /** Сумма сделки NUMERIC(14,2), ≥0; null если не задана. */
  amount: number | null;
  /** Валюта, ISO-код из 3 букв в верхнем регистре (RUB, USD, EUR). */
  currency: string;
  /** Вероятность закрытия, 0–100%; null если не задана. */
  probability: number | null;
  /** Ожидаемая дата закрытия (план), YYYY-MM-DD; null если не задана. */
  expected_close_at: string | null;
  /** Фактический момент закрытия (RFC3339); проставляется бэкендом при WON/LOST. */
  closed_at: string | null;
  /** Ответственный — оператор организации (customer_users). */
  assigned_to: string | null;
  /** Автор — оператор; проставляется бэкендом. На PUT-ответе приходит null. */
  created_by: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DealSortBy =
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'status'
  | 'amount'
  | 'expected_close_at';

export type DealListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  client_id?: string;
  status?: DealStatus;
  assigned_to?: string;
  /** Подстрока по названию. */
  search?: string;
  sort_by?: DealSortBy;
  order?: SortOrder;
};

/**
 * Тело create/update сделки. При update действует PUT-семантика (полная замена):
 * непереданные поля сбрасываются (description → '', status → NEW, currency → USD,
 * amount/probability/expected_close_at → null, привязки → null, attributes → {}).
 * `created_by` и `closed_at` — только чтение, в теле не передаются.
 */
export type DealInput = {
  title: string;
  description?: string;
  status?: DealStatus;
  amount?: number | null;
  currency?: string;
  probability?: number | null;
  expected_close_at?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  assigned_to?: string | null;
  attributes?: Record<string, unknown>;
};

export type UpdateDealInput = DealInput & { id: string };

export type DeleteDealResponse = { id: string; deleted_at: string };

/**
 * Как и у задач, сделки тянут несколько связей и на «холодном» удалённом бэкенде
 * отвечают дольше стандартных 20с. Даём увеличенный таймаут, чтобы список и сохранение
 * не срывались раньше времени.
 */
const DEALS_TIMEOUT_MS = 45_000;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listDeals(
  token: string,
  params: DealListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Deal>> {
  const query = buildQuery({
    page: params.page,
    page_size: params.page_size,
    project_id: params.project_id,
    client_id: params.client_id,
    status: params.status,
    assigned_to: params.assigned_to,
    search: params.search,
    sort_by: params.sort_by,
    order: params.order,
  });
  return api.get<Paginated<Deal>>(`/deals/list${query}`, {
    token,
    signal,
    timeoutMs: DEALS_TIMEOUT_MS,
  });
}

export function createDeal(token: string, input: DealInput): Promise<Deal> {
  return api.post<Deal>('/deals/create', input, { token, timeoutMs: DEALS_TIMEOUT_MS });
}

export function updateDeal(token: string, input: UpdateDealInput): Promise<Deal> {
  return api.put<Deal>('/deals/update', input, { token, timeoutMs: DEALS_TIMEOUT_MS });
}

export function deleteDeal(token: string, id: string): Promise<DeleteDealResponse> {
  return api.delete<DeleteDealResponse>('/deals/delete', { id }, { token, timeoutMs: DEALS_TIMEOUT_MS });
}
