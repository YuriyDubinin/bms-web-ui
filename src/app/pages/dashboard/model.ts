import type {
  DealStatus,
  DealType,
  ClientStatus,
  ClientSubjectType,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  ServiceStatus,
  ProcessStatus,
  StatsBucket,
  StatsPeriod,
  TimeseriesInterval,
  TimeseriesMetric,
} from '@app/api';

// Метки переиспользуем из моделей разделов — единообразие по всему продукту.
import { DEAL_STATUSES, DEAL_STATUS_LABELS, DEAL_TYPES, DEAL_TYPE_LABELS } from '../deals/model';
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  CLIENT_SUBJECT_TYPES,
  CLIENT_SUBJECT_TYPE_LABELS,
} from '../clients/model';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from '../tasks/model';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../projects/model';
import { SERVICE_STATUSES, SERVICE_STATUS_LABELS } from '../services/model';
import { PROCESS_STATUSES, PROCESS_STATUS_LABELS } from '../processes/model';

/**
 * Семантические цвета для графиков — те же дизайн-токены (CSS-переменные), что и в chip'ах.
 * SVG-элементы Recharts принимают var(--…) и живо перекрашиваются при смене темы.
 */
const C = {
  accent: 'var(--accent)',
  success: 'var(--state-success)',
  error: 'var(--state-error)',
  warning: 'var(--state-warning)',
  info: 'var(--state-info)',
  muted: 'var(--fg-muted)',
  neutral: 'var(--border-strong)',
} as const;

export const DEAL_STATUS_COLOR: Record<DealStatus, string> = {
  NEW: C.info,
  PENDING: C.warning,
  WON: C.success,
  LOST: C.error,
};
export const DEAL_TYPE_COLOR: Record<DealType, string> = {
  INCOME: C.success,
  EXPENSE: C.warning,
};
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: C.muted,
  IN_PROGRESS: C.info,
  BLOCKED: C.error,
  DONE: C.success,
  CANCELLED: C.neutral,
};
export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: C.muted,
  MEDIUM: C.info,
  HIGH: C.warning,
  URGENT: C.error,
};
export const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  LEAD: C.info,
  ACTIVE: C.success,
  INACTIVE: C.warning,
  ARCHIVED: C.muted,
};
export const CLIENT_SUBJECT_TYPE_COLOR: Record<ClientSubjectType, string> = {
  INDIVIDUAL: C.accent,
  LEGAL_ENTITY: C.info,
};
export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  DRAFT: C.muted,
  ACTIVE: C.success,
  ON_HOLD: C.warning,
  ARCHIVED: C.neutral,
};
export const SERVICE_STATUS_COLOR: Record<ServiceStatus, string> = {
  ACTIVE: C.success,
  INACTIVE: C.warning,
  ARCHIVED: C.muted,
};
export const PROCESS_STATUS_COLOR: Record<ProcessStatus, string> = {
  ACTIVE: C.info,
  COMPLETED: C.success,
  FAILED: C.error,
};

/**
 * Категориальная палитра для свободных измерений (источники, категории, исполнители),
 * где нет семантики. Фиксированные тона (уровня Tailwind-500) читаются и на светлых,
 * и на тёмных темах.
 */
export const CHART_PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#0ea5e9',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#ef4444',
] as const;

/** Готовый ряд для графика: имя, число (count), сумма (amount), цвет. */
export type ChartDatum = { key: string; name: string; count: number; amount: number; color: string };

/**
 * Мёржит разбивку со справочником: фиксированный порядок категорий, метки из словаря,
 * семантические цвета; отсутствующие в ответе категории добавляются с нулём.
 */
export function bucketsToData<T extends string>(
  buckets: StatsBucket[],
  order: readonly T[],
  labels: Record<T, string>,
  colors: Record<T, string>,
): ChartDatum[] {
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  return order.map((k) => {
    const b = byKey.get(k);
    return { key: k, name: labels[k], count: b?.count ?? 0, amount: b?.amount ?? 0, color: colors[k] };
  });
}

/** Ряд для свободных измерений (текст/uuid): метка = label || key || «не указано», цвет из палитры. */
export function freeBucketsToData(buckets: StatsBucket[], emptyLabel = 'Не указано'): ChartDatum[] {
  return buckets.map((b, i) => ({
    key: b.key || '(empty)',
    name: b.label || b.key || emptyLabel,
    count: b.count,
    amount: b.amount,
    color: CHART_PALETTE[i % CHART_PALETTE.length]!,
  }));
}

// Готовые «строители» рядов по каждому измерению — чтобы страница не тянула словари.
export const dealStatusData = (b: StatsBucket[]) =>
  bucketsToData(b, DEAL_STATUSES, DEAL_STATUS_LABELS, DEAL_STATUS_COLOR);
export const dealTypeData = (b: StatsBucket[]) =>
  bucketsToData(b, DEAL_TYPES, DEAL_TYPE_LABELS, DEAL_TYPE_COLOR);
export const clientStatusData = (b: StatsBucket[]) =>
  bucketsToData(b, CLIENT_STATUSES, CLIENT_STATUS_LABELS, CLIENT_STATUS_COLOR);
export const clientSubjectData = (b: StatsBucket[]) =>
  bucketsToData(b, CLIENT_SUBJECT_TYPES, CLIENT_SUBJECT_TYPE_LABELS, CLIENT_SUBJECT_TYPE_COLOR);
export const taskStatusData = (b: StatsBucket[]) =>
  bucketsToData(b, TASK_STATUSES, TASK_STATUS_LABELS, TASK_STATUS_COLOR);
export const taskPriorityData = (b: StatsBucket[]) =>
  bucketsToData(b, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLOR);
export const projectStatusData = (b: StatsBucket[]) =>
  bucketsToData(b, PROJECT_STATUSES, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLOR);
export const serviceStatusData = (b: StatsBucket[]) =>
  bucketsToData(b, SERVICE_STATUSES, SERVICE_STATUS_LABELS, SERVICE_STATUS_COLOR);
export const processStatusData = (b: StatsBucket[]) =>
  bucketsToData(b, PROCESS_STATUSES, PROCESS_STATUS_LABELS, PROCESS_STATUS_COLOR);

// ── Форматтеры ────────────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString('ru-RU')} ${currency}`;
  }
}
export function formatCompact(n: number): string {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// ── Период (единый переключатель) ──────────────────────────────────────────────
export type PeriodPreset = { key: string; label: string; days: number | null };

/** Пресеты периода; days=null — «всё время» (без from/to). */
export const PERIOD_PRESETS: PeriodPreset[] = [
  { key: 'all', label: 'Всё время', days: null },
  { key: '7d', label: '7 дней', days: 7 },
  { key: '30d', label: '30 дней', days: 30 },
  { key: '90d', label: 'Квартал', days: 90 },
  { key: '365d', label: 'Год', days: 365 },
];

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Пресет → диапазон {from,to} в формате YYYY-MM-DD (пусто для «всё время»). */
export function presetRange(days: number | null): StatsPeriod {
  if (days === null) return {};
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toDateInput(from), to: toDateInput(to) };
}

// ── Timeseries ──────────────────────────────────────────────────────────────
export type MetricMeta = { metric: TimeseriesMetric; label: string; money: boolean };

export const TIMESERIES_METRICS: MetricMeta[] = [
  { metric: 'revenue', label: 'Выручка', money: true },
  { metric: 'expenses', label: 'Расходы', money: true },
  { metric: 'deals_created', label: 'Создано сделок', money: false },
  { metric: 'deals_won', label: 'Выиграно сделок', money: false },
  { metric: 'clients_created', label: 'Новые клиенты', money: false },
  { metric: 'tasks_created', label: 'Создано задач', money: false },
  { metric: 'tasks_completed', label: 'Выполнено задач', money: false },
  { metric: 'processes_created', label: 'Создано процессов', money: false },
];

export const INTERVAL_OPTIONS: { value: TimeseriesInterval; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Подпись точки тренда на оси X по дате начала интервала (YYYY-MM-DD). */
export function formatPeriodLabel(period: string, interval: TimeseriesInterval): string {
  const [y, m, d] = period.split('-').map(Number);
  if (!y || !m || !d) return period;
  const mon = MONTHS_SHORT[m - 1] ?? '';
  if (interval === 'month') return `${mon} ${String(y).slice(2)}`;
  return `${String(d).padStart(2, '0')} ${mon}`;
}
