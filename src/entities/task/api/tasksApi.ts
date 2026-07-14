import { api, buildQuery, type ListResponse } from '@shared/api';
import type {
  CreateTaskInput,
  DeleteTaskResponse,
  Task,
  TaskListParams,
  UpdateTaskInput,
} from '../model';

export function listTasks(
  params: TaskListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Task>> {
  return api.get<ListResponse<Task>>(`/api/tasks/list${buildQuery(params)}`, { signal });
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return api.post<Task>('/api/tasks/create', input);
}

export function updateTask(input: UpdateTaskInput): Promise<Task> {
  return api.put<Task>('/api/tasks/update', input);
}

export function deleteTask(id: string): Promise<DeleteTaskResponse> {
  return api.delete<DeleteTaskResponse>('/api/tasks/delete', { id });
}
