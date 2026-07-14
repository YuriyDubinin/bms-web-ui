import type { ChipTone } from '@shared/ui';
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskPriority, type TaskStatus } from './types';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

export const TASK_STATUS_TONES: Record<TaskStatus, ChipTone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  BLOCKED: 'warning',
  DONE: 'success',
  CANCELLED: 'neutral',
};

export const TASK_STATUS_OPTIONS = TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }));

/** Порядок колонок kanban-доски. */
export const KANBAN_COLUMNS: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const TASK_PRIORITY_TONES: Record<TaskPriority, ChipTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

export const TASK_PRIORITY_OPTIONS = TASK_PRIORITIES.map((p) => ({
  value: p,
  label: TASK_PRIORITY_LABELS[p],
}));

/** Тело update = create + id; чтобы сменить только статус, сохраняем остальные поля as-is. */
export function buildUpdateFromTask(task: Task, overrides: Partial<CreateTaskFields> = {}) {
  return {
    id: task.id,
    project_id: task.project_id ?? undefined,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigned_to: task.assigned_to ?? undefined,
    due_at: task.due_at ?? undefined,
    attributes: task.attributes,
    ...overrides,
  };
}

type CreateTaskFields = {
  project_id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  due_at?: string;
  attributes?: Record<string, unknown>;
};
