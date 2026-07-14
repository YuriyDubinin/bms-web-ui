import type { ProjectStatus } from '@app/api';

export const PROJECT_STATUSES: ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'ARCHIVED'];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ON_HOLD: 'На паузе',
  ARCHIVED: 'В архиве',
};

/** Цветовой тон chip'а статуса (классы токенов). */
export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  DRAFT: 'bg-bg-2 text-fg-secondary',
  ACTIVE: 'bg-state-success-muted text-state-success',
  ON_HOLD: 'bg-state-warning-muted text-state-warning',
  ARCHIVED: 'bg-bg-2 text-fg-muted',
};

/** RFC3339 → локальная дата (для created_at/updated_at). */
export function formatDateTime(iso: string): string {
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

/** Читаемый период проекта из дат начала/окончания. */
export function formatPeriod(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return '—';
  return `${formatDateOnly(startsAt)} → ${formatDateOnly(endsAt)}`;
}
