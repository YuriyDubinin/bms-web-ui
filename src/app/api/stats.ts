import { api } from './client';

/**
 * Единый формат корзины разбивки (by_*). key — значение измерения (enum/uuid/текст),
 * '' = «не задано»; label заполнен там, где key это uuid (напр. имя исполнителя).
 * amount осмысленен только у сделок, иначе 0.
 */
export type StatsBucket = { key: string; label: string; count: number; amount: number };

/** Финансовый агрегат по одной валюте. */
export type FinanceStat = {
  currency: string;
  revenue: number;
  expenses: number;
  net: number;
  pipeline: number;
  weighted_pipeline: number;
  won_count: number;
  lost_count: number;
  /** Доля выигрышей 0..1. */
  win_rate: number;
};

/** Общий фильтр периода (по created_at сущности; у timeseries — по дате метрики). */
export type StatsPeriod = { from?: string; to?: string };

export type SummaryStats = {
  clients: { total: number; active: number; leads: number };
  deals: { total: number; open: number; won: number; lost: number };
  projects: { total: number; active: number };
  services: { total: number; active: number };
  tasks: { total: number; open: number; overdue: number; done: number };
  processes: { total: number; active: number; completed: number; failed: number };
  users: { total: number };
  finance: FinanceStat[];
};

export type DealsStats = {
  by_status: StatsBucket[];
  by_type: StatsBucket[];
  by_assignee: StatsBucket[];
  finance: FinanceStat[];
};

export type ClientsStats = {
  total: number;
  by_status: StatsBucket[];
  by_subject_type: StatsBucket[];
  by_source: StatsBucket[];
};

export type TasksStats = {
  total: number;
  open: number;
  overdue: number;
  done: number;
  by_status: StatsBucket[];
  by_priority: StatsBucket[];
  by_assignee: StatsBucket[];
};

export type ProjectsStats = { total: number; by_status: StatsBucket[] };
export type ServicesStats = { total: number; by_status: StatsBucket[]; by_category: StatsBucket[] };
export type ProcessesStats = { total: number; by_status: StatsBucket[] };

export type TimeseriesMetric =
  | 'deals_created'
  | 'deals_won'
  | 'revenue'
  | 'expenses'
  | 'clients_created'
  | 'tasks_created'
  | 'tasks_completed'
  | 'processes_created';

export type TimeseriesInterval = 'day' | 'week' | 'month';
export type TimeseriesPoint = { period: string; value: number };
export type TimeseriesResponse = {
  metric: TimeseriesMetric;
  interval: TimeseriesInterval;
  currency: string;
  points: TimeseriesPoint[];
};

export type TimeseriesParams = StatsPeriod & {
  metric: TimeseriesMetric;
  interval?: TimeseriesInterval;
  /** ISO-код валюты — фильтр для денежных метрик (revenue/expenses). */
  currency?: string;
};

/** Статистика агрегирует много данных — даём увеличенный таймаут (как задачи/сделки). */
const STATS_TIMEOUT_MS = 45_000;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

type Ctx = { token: string; signal?: AbortSignal };

function get<T>(path: string, period: StatsPeriod, { token, signal }: Ctx): Promise<T> {
  const query = buildQuery({ from: period.from, to: period.to });
  return api.get<T>(`${path}${query}`, { token, signal, timeoutMs: STATS_TIMEOUT_MS });
}

export function getSummaryStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<SummaryStats>('/stats/summary', period, { token, signal });
}
export function getDealsStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<DealsStats>('/stats/deals', period, { token, signal });
}
export function getClientsStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<ClientsStats>('/stats/clients', period, { token, signal });
}
export function getTasksStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<TasksStats>('/stats/tasks', period, { token, signal });
}
export function getProjectsStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<ProjectsStats>('/stats/projects', period, { token, signal });
}
export function getServicesStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<ServicesStats>('/stats/services', period, { token, signal });
}
export function getProcessesStats(token: string, period: StatsPeriod = {}, signal?: AbortSignal) {
  return get<ProcessesStats>('/stats/processes', period, { token, signal });
}

export function getTimeseries(
  token: string,
  params: TimeseriesParams,
  signal?: AbortSignal,
): Promise<TimeseriesResponse> {
  const query = buildQuery({
    metric: params.metric,
    interval: params.interval,
    currency: params.currency,
    from: params.from,
    to: params.to,
  });
  return api.get<TimeseriesResponse>(`/stats/timeseries${query}`, {
    token,
    signal,
    timeoutMs: STATS_TIMEOUT_MS,
  });
}
