import { api } from './client';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'ARCHIVED';

/** Модель проекта (ответ API). */
export type Project = {
  id: string;
  name: string;
  slug: string;
  direction: string;
  description: string;
  status: ProjectStatus;
  attributes: Record<string, unknown>;
  /** Дата начала, YYYY-MM-DD (не datetime). */
  starts_at: string | null;
  /** Дата окончания, YYYY-MM-DD (не datetime). */
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type ProjectSortBy = 'created_at' | 'updated_at' | 'name' | 'status';
export type SortOrder = 'asc' | 'desc';

export type ProjectListParams = {
  page?: number;
  page_size?: number;
  status?: ProjectStatus;
  search?: string;
  sort_by?: ProjectSortBy;
  order?: SortOrder;
};

/**
 * Тело create/update. Все опциональные поля — контролируемые: при update действует
 * PUT-семантика (полная замена), поэтому фронт всегда отправляет все поля проекта.
 */
export type ProjectInput = {
  name: string;
  slug?: string;
  direction?: string;
  description?: string;
  status?: ProjectStatus;
  attributes?: Record<string, unknown>;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type UpdateProjectInput = ProjectInput & { id: string };

export type DeleteProjectResponse = { id: string; deleted_at: string };

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listProjects(
  token: string,
  params: ProjectListParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Project>> {
  const query = buildQuery({
    page: params.page,
    page_size: params.page_size,
    status: params.status,
    search: params.search,
    sort_by: params.sort_by,
    order: params.order,
  });
  return api.get<Paginated<Project>>(`/projects/list${query}`, { token, signal });
}

export function createProject(token: string, input: ProjectInput): Promise<Project> {
  return api.post<Project>('/projects/create', input, { token });
}

export function updateProject(token: string, input: UpdateProjectInput): Promise<Project> {
  return api.put<Project>('/projects/update', input, { token });
}

export function deleteProject(token: string, id: string): Promise<DeleteProjectResponse> {
  return api.delete<DeleteProjectResponse>('/projects/delete', { id }, { token });
}
