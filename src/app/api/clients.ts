import { api } from './client';
import type { Paginated, Project, SortOrder } from './projects';

export type ClientStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/** Вид субъекта: физическое или юридическое лицо. Задаётся явно (не выводится из ФИО/компании). */
export type ClientSubjectType = 'INDIVIDUAL' | 'LEGAL_ENTITY';

/** Модель клиента (ответ API). */
export type Client = {
  id: string;
  /** «Домашний» проект-направление; null, если клиент не привязан к проекту. */
  project_id: string | null;
  /** Имя; '' если не задано. */
  first_name: string;
  /** Фамилия; '' если не задано. */
  last_name: string;
  /** Название компании; '' если не задано. */
  company_name: string;
  /** Email (в нижнем регистре); '' если не задан. */
  email: string;
  /** Телефон (свободный формат); '' если не задан. */
  phone: string;
  status: ClientStatus;
  /** Вид субъекта; всегда присутствует (по умолчанию INDIVIDUAL). */
  subject_type: ClientSubjectType;
  /** Источник/канал привлечения (свободный текст); '' если не задан. */
  source: string;
  /** Адрес — произвольный JSON. ВНИМАНИЕ: приходит null, если не задан (в отличие от attributes). */
  address: Record<string, unknown> | null;
  /** Произвольный JSON; всегда объект, минимум {}. */
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ClientSortBy =
  | 'created_at'
  | 'updated_at'
  | 'first_name'
  | 'last_name'
  | 'company_name';

export type ClientListParams = {
  page?: number;
  page_size?: number;
  /** Только клиенты этого проекта. */
  project_id?: string;
  status?: ClientStatus;
  subject_type?: ClientSubjectType;
  /** Подстрока по имени, фамилии, компании, email и телефону. */
  search?: string;
  sort_by?: ClientSortBy;
  order?: SortOrder;
};

/**
 * Тело create/update клиента. При update действует PUT-семантика (полная замена):
 * поля, которые не переданы, сбрасываются на сервере (строки → '', address → null,
 * attributes → {}, status → LEAD, project_id → null). Поэтому форма всегда отправляет
 * все поля целиком.
 *
 * ⚠️ Бизнес-правило: должно быть заполнено хотя бы одно из first_name/last_name/company_name.
 */
export type ClientInput = {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  status?: ClientStatus;
  /** Вид субъекта; при update отправлять всегда (PUT-семантика), иначе сбросится в INDIVIDUAL. */
  subject_type?: ClientSubjectType;
  source?: string;
  project_id?: string | null;
  address?: Record<string, unknown> | null;
  attributes?: Record<string, unknown>;
};

export type UpdateClientInput = ClientInput & { id: string };

export type DeleteClientResponse = { id: string; deleted_at: string };

/**
 * Клиентские эндпоинты (особенно create/update) на бэкенде отвечают медленно — иногда >20с.
 * Даём увеличенный таймаут, чтобы сохранение и загрузка списка не срывались раньше времени.
 */
const CLIENTS_TIMEOUT_MS = 45_000;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listClients(
  token: string,
  params: ClientListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Client>> {
  const query = buildQuery({
    page: params.page,
    page_size: params.page_size,
    project_id: params.project_id,
    status: params.status,
    subject_type: params.subject_type,
    search: params.search,
    sort_by: params.sort_by,
    order: params.order,
  });
  return api.get<Paginated<Client>>(`/clients/list${query}`, {
    token,
    signal,
    timeoutMs: CLIENTS_TIMEOUT_MS,
  });
}

export function createClient(token: string, input: ClientInput): Promise<Client> {
  return api.post<Client>('/clients/create', input, { token, timeoutMs: CLIENTS_TIMEOUT_MS });
}

export function updateClient(token: string, input: UpdateClientInput): Promise<Client> {
  return api.put<Client>('/clients/update', input, { token, timeoutMs: CLIENTS_TIMEOUT_MS });
}

export function deleteClient(token: string, id: string): Promise<DeleteClientResponse> {
  return api.delete<DeleteClientResponse>(
    '/clients/delete',
    { id },
    { token, timeoutMs: CLIENTS_TIMEOUT_MS },
  );
}

// ─────────── Проекты клиента (M:N): основной проект + дополнительные членства ───────────

/** Ответ attach/detach — статус операции (идемпотентно). */
export type ClientProjectLinkResponse = { status: 'ATTACHED' | 'DETACHED' };

/**
 * Все проекты клиента (основной + членства), без дублей. Какой из них основной —
 * определяется сравнением с `client.project_id` на стороне UI.
 */
export function listClientProjects(
  token: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<Project[]> {
  return api
    .get<{ items: Project[] }>(`/clients/projects/list?client_id=${encodeURIComponent(clientId)}`, {
      token,
      signal,
      timeoutMs: CLIENTS_TIMEOUT_MS,
    })
    .then((res) => res.items ?? []);
}

/** Добавить клиента в проект (дополнительное членство). Идемпотентно. */
export function attachClientProject(
  token: string,
  clientId: string,
  projectId: string,
): Promise<ClientProjectLinkResponse> {
  return api.post<ClientProjectLinkResponse>(
    '/clients/projects/attach',
    { client_id: clientId, project_id: projectId },
    { token, timeoutMs: CLIENTS_TIMEOUT_MS },
  );
}

/** Убрать клиента из проекта (только дополнительное членство, не основной). Идемпотентно. */
export function detachClientProject(
  token: string,
  clientId: string,
  projectId: string,
): Promise<ClientProjectLinkResponse> {
  return api.delete<ClientProjectLinkResponse>(
    '/clients/projects/detach',
    { client_id: clientId, project_id: projectId },
    { token, timeoutMs: CLIENTS_TIMEOUT_MS },
  );
}
