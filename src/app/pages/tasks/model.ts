import type { TaskPriority, TaskStatus } from '@app/api';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  BLOCKED: 'Заблокирована',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

/** Цветовой тон chip'а статуса задачи (классы токенов). */
export const TASK_STATUS_TONE: Record<TaskStatus, string> = {
  TODO: 'bg-bg-2 text-fg-secondary',
  IN_PROGRESS: 'bg-state-info-muted text-state-info',
  BLOCKED: 'bg-state-error-muted text-state-error',
  DONE: 'bg-state-success-muted text-state-success',
  CANCELLED: 'bg-bg-2 text-fg-muted',
};

export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

/** Цветовой тон chip'а приоритета (от нейтрального к тревожному). */
export const TASK_PRIORITY_TONE: Record<TaskPriority, string> = {
  LOW: 'bg-bg-2 text-fg-muted',
  MEDIUM: 'bg-bg-2 text-fg-secondary',
  HIGH: 'bg-state-warning-muted text-state-warning',
  URGENT: 'bg-state-error-muted text-state-error',
};

/** Активные статусы — для которых имеет смысл говорить о «просрочке» срока. */
const ACTIVE_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED'];

/** Задача просрочена: срок в прошлом и статус ещё активный (не выполнена/не отменена). */
export function isOverdue(dueAt: string | null, status: TaskStatus): boolean {
  if (!dueAt || !ACTIVE_STATUSES.includes(status)) return false;
  const t = new Date(dueAt).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

/** Срок задачи «ДД.ММ.ГГГГ, ЧЧ:ММ»; '—' если не задан. */
export function formatDueAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** RFC3339 → локальная дата (для created_at/completed_at). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** RFC3339 → значение для <input type="datetime-local"> (локальная зона, до минут). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Значение datetime-local → RFC3339 (UTC); null если пусто/невалидно. */
export function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
