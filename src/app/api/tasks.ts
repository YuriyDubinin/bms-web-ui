import { api } from './client';
import type { Paginated, SortOrder } from './projects';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Модель задачи (ответ API). */
export type Task = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  deal_id: string | null;
  title: string;
  /** Описание; '' если не задано. */
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Исполнитель — оператор организации (customer_users), не клиент. */
  assigned_to: string | null;
  /** Автор — оператор; проставляется бэкендом. На PUT-ответе приходит null. */
  created_by: string | null;
  /** Срок выполнения, RFC3339. */
  due_at: string | null;
  /** Момент завершения — проставляется бэкендом при статусе DONE (только чтение). */
  completed_at: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TaskSortBy =
  | 'created_at'
  | 'updated_at'
  | 'due_at'
  | 'priority'
  | 'status'
  | 'title';

export type TaskListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  client_id?: string;
  deal_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  /** Подстрока по заголовку. */
  search?: string;
  /** Вернёт задачи с due_at ≤ этой даты (RFC3339). */
  due_before?: string;
  /** Вернёт задачи с due_at ≥ этой даты (RFC3339). */
  due_after?: string;
  sort_by?: TaskSortBy;
  order?: SortOrder;
};

/**
 * Тело create/update задачи. При update действует PUT-семантика (полная замена):
 * непереданные поля сбрасываются (description → '', status → TODO, priority → MEDIUM,
 * привязки project/client/deal/assigned → null, due_at → null, attributes → {}).
 * `created_by` и `completed_at` — только чтение, в теле не передаются.
 */
export type TaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: string | null;
  client_id?: string | null;
  deal_id?: string | null;
  assigned_to?: string | null;
  due_at?: string | null;
  attributes?: Record<string, unknown>;
};

export type UpdateTaskInput = TaskInput & { id: string };

export type DeleteTaskResponse = { id: string; deleted_at: string };

/**
 * Эндпоинты задач тяжелее прочих: запись тянет до четырёх связей (проект/клиент/сделка/
 * исполнитель), и на «холодном» удалённом бэкенде ответ может превышать стандартные 20с.
 * Даём задачам увеличенный таймаут, чтобы список и сохранение не срывались раньше времени.
 */
const TASKS_TIMEOUT_MS = 45_000;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listTasks(
  token: string,
  params: TaskListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Task>> {
  const query = buildQuery({
    page: params.page,
    page_size: params.page_size,
    project_id: params.project_id,
    client_id: params.client_id,
    deal_id: params.deal_id,
    status: params.status,
    priority: params.priority,
    assigned_to: params.assigned_to,
    search: params.search,
    due_before: params.due_before,
    due_after: params.due_after,
    sort_by: params.sort_by,
    order: params.order,
  });
  return api.get<Paginated<Task>>(`/tasks/list${query}`, {
    token,
    signal,
    timeoutMs: TASKS_TIMEOUT_MS,
  });
}

export function createTask(token: string, input: TaskInput): Promise<Task> {
  return api.post<Task>('/tasks/create', input, { token, timeoutMs: TASKS_TIMEOUT_MS });
}

export function updateTask(token: string, input: UpdateTaskInput): Promise<Task> {
  return api.put<Task>('/tasks/update', input, { token, timeoutMs: TASKS_TIMEOUT_MS });
}

export function deleteTask(token: string, id: string): Promise<DeleteTaskResponse> {
  return api.delete<DeleteTaskResponse>('/tasks/delete', { id }, { token, timeoutMs: TASKS_TIMEOUT_MS });
}
