import type { SortOrder } from '@shared/api';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type Task = {
  id: string;
  project_id: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string | null;
  due_at: string | null;
  completed_at: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TaskSortBy = 'created_at' | 'updated_at' | 'due_at' | 'priority' | 'status' | 'title';

export type TaskListParams = {
  page?: number;
  page_size?: number;
  project_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  search?: string;
  due_before?: string;
  due_after?: string;
  sort_by?: TaskSortBy;
  order?: SortOrder;
};

export type CreateTaskInput = {
  project_id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  due_at?: string;
  attributes?: Record<string, unknown>;
};

export type UpdateTaskInput = CreateTaskInput & { id: string };

export type DeleteTaskResponse = {
  id: string;
  deleted_at: string;
};
