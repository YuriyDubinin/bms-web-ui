import { api } from './client';
import type { Paginated, SortOrder } from './projects';

export type ProcessStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';

/** Модель процесса (ответ API). */
export type Process = {
  id: string;
  /** Проект-владелец процесса; null, если процесс не привязан к проекту. */
  project_id: string | null;
  name: string;
  /** Описание; '' если не задано. */
  description: string;
  status: ProcessStatus;
  /** Момент завершения; проставляется бэкендом при COMPLETED/FAILED, иначе null. Только чтение. */
  closed_at: string | null;
  /** Плановое начало, YYYY-MM-DD; null если не задано. Для календарной полосы. */
  starts_at: string | null;
  /** Плановое окончание, YYYY-MM-DD; null если не задано. Для календарной полосы. */
  ends_at: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** Этап процесса (process_stages). Нужен для привязки задач к конкретному шагу. */
export type ProcessStage = {
  id: string;
  process_id: string;
  name: string;
  description: string;
  /** Порядок сортировки (по возрастанию). */
  position: number;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProcessSortBy = 'created_at' | 'updated_at' | 'name' | 'status';

export type ProcessListParams = {
  page?: number;
  page_size?: number;
  /** Только процессы этого проекта. */
  project_id?: string;
  status?: ProcessStatus;
  /** Подстрока по названию. */
  search?: string;
  /** Оконный фильтр календаря: процесс попадёт, если [starts_at, ends_at] пересекает [from, to]. */
  from?: string;
  /** Оконный фильтр календаря (верхняя граница окна; NULL-граница интервала = открытая). */
  to?: string;
  sort_by?: ProcessSortBy;
  order?: SortOrder;
};

/**
 * Тело create/update процесса. При update действует PUT-семантика (полная замена):
 * непереданные поля сбрасываются (description → '', status → ACTIVE, attributes → {},
 * project_id → null). `closed_at` — только чтение (ставится бэкендом), в теле не передаётся.
 */
export type ProcessInput = {
  name: string;
  description?: string;
  status?: ProcessStatus;
  /** Проект-владелец; если не прислать — процесс отвяжется от проекта (null). */
  project_id?: string | null;
  /** Плановое начало, YYYY-MM-DD (nullable). */
  starts_at?: string | null;
  /** Плановое окончание, YYYY-MM-DD (nullable). */
  ends_at?: string | null;
  attributes?: Record<string, unknown>;
};

export type UpdateProcessInput = ProcessInput & { id: string };

export type DeleteProcessResponse = { id: string; deleted_at: string };

/**
 * Процессные эндпоинты на «холодном» удалённом бэкенде отвечают медленно (как задачи и
 * сделки). Даём увеличенный таймаут, чтобы список и сохранение не срывались раньше времени.
 */
const PROCESSES_TIMEOUT_MS = 45_000;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listProcesses(
  token: string,
  params: ProcessListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Process>> {
  const query = buildQuery({
    page: params.page,
    page_size: params.page_size,
    project_id: params.project_id,
    status: params.status,
    search: params.search,
    from: params.from,
    to: params.to,
    sort_by: params.sort_by,
    order: params.order,
  });
  return api.get<Paginated<Process>>(`/processes/list${query}`, {
    token,
    signal,
    timeoutMs: PROCESSES_TIMEOUT_MS,
  });
}

export function createProcess(token: string, input: ProcessInput): Promise<Process> {
  return api.post<Process>('/processes/create', input, { token, timeoutMs: PROCESSES_TIMEOUT_MS });
}

export function updateProcess(token: string, input: UpdateProcessInput): Promise<Process> {
  return api.put<Process>('/processes/update', input, { token, timeoutMs: PROCESSES_TIMEOUT_MS });
}

export function deleteProcess(token: string, id: string): Promise<DeleteProcessResponse> {
  return api.delete<DeleteProcessResponse>(
    '/processes/delete',
    { id },
    { token, timeoutMs: PROCESSES_TIMEOUT_MS },
  );
}

/**
 * Этапы процесса — по порядку (position), без пагинации: ответ `{ items: [...] }`.
 * Нужны форме задачи: выбрал процесс → показываем список его этапов.
 */
export function listProcessStages(
  token: string,
  processId: string,
  signal?: AbortSignal,
): Promise<ProcessStage[]> {
  return api
    .get<{ items: ProcessStage[] }>(`/processes/stages/list?process_id=${encodeURIComponent(processId)}`, {
      token,
      signal,
      timeoutMs: PROCESSES_TIMEOUT_MS,
    })
    .then((res) => res.items ?? []);
}
