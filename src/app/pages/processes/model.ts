import type { ProcessStatus } from '@app/api';

/** Порядок соответствует жизненному циклу: в работе → завершён → провален. */
export const PROCESS_STATUSES: ProcessStatus[] = ['ACTIVE', 'COMPLETED', 'FAILED'];

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  ACTIVE: 'В работе',
  COMPLETED: 'Завершён',
  FAILED: 'Провален',
};

/**
 * Цветовой тон chip'а статуса (классы токенов): нейтральный (в работе) →
 * зелёный (завершён удачно) / красный (провал). Как советует бэкенд-подсказка.
 */
export const PROCESS_STATUS_TONE: Record<ProcessStatus, string> = {
  ACTIVE: 'bg-bg-2 text-fg-secondary',
  COMPLETED: 'bg-state-success-muted text-state-success',
  FAILED: 'bg-state-error-muted text-state-error',
};

/** RFC3339 → локальная дата (для created_at/closed_at); '—' если не задана. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}

/** YYYY-MM-DD → DD.MM.YYYY (для starts_at/ends_at). */
export function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

/** Читаемый плановый период процесса из дат начала/окончания. '—' если обе пусты. */
export function formatPeriod(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return '—';
  return `${formatDateOnly(startsAt)} → ${formatDateOnly(endsAt)}`;
}
