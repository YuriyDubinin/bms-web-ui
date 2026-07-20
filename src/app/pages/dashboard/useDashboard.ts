import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  getSummaryStats,
  getDealsStats,
  getClientsStats,
  getTasksStats,
  getProjectsStats,
  getServicesStats,
  getProcessesStats,
  getTimeseries,
  type StatsPeriod,
  type SummaryStats,
  type DealsStats,
  type ClientsStats,
  type TasksStats,
  type ProjectsStats,
  type ServicesStats,
  type ProcessesStats,
  type TimeseriesParams,
  type TimeseriesResponse,
} from '@app/api';
import { useAuth } from '@app/auth';

export type DashboardData = {
  summary: SummaryStats | null;
  deals: DealsStats | null;
  clients: ClientsStats | null;
  tasks: TasksStats | null;
  projects: ProjectsStats | null;
  services: ServicesStats | null;
  processes: ProcessesStats | null;
};

const EMPTY: DashboardData = {
  summary: null,
  deals: null,
  clients: null,
  tasks: null,
  projects: null,
  services: null,
  processes: null,
};

function isUnauthorized(r: PromiseSettledResult<unknown>): boolean {
  return r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401;
}
function pick<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}

/**
 * Грузит все виджеты дашборда за один период параллельно. Через allSettled: если отдельный
 * эндпоинт упадёт (напр. серверный 500 у процессов), остальные виджеты всё равно отрисуются.
 * Общий баннер ошибки — только если не удалось вообще ничего (или истёк токен → разлогин).
 */
export function useDashboard(period: StatsPeriod) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const { from, to } = period;

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const { signal } = controller;
    const p = { from, to };
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      getSummaryStats(token, p, signal),
      getDealsStats(token, p, signal),
      getClientsStats(token, p, signal),
      getTasksStats(token, p, signal),
      getProjectsStats(token, p, signal),
      getServicesStats(token, p, signal),
      getProcessesStats(token, p, signal),
    ])
      .then((results) => {
        if (signal.aborted) return;
        if (results.some(isUnauthorized)) {
          void logout();
          return;
        }
        setData({
          summary: pick(results[0]),
          deals: pick(results[1]),
          clients: pick(results[2]),
          tasks: pick(results[3]),
          projects: pick(results[4]),
          services: pick(results[5]),
          processes: pick(results[6]),
        });
        if (results.every((r) => r.status === 'rejected')) {
          setError('Не удалось загрузить статистику. Попробуйте обновить страницу.');
        }
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, reloadKey, from, to]);

  return { data, isLoading, error, reload };
}

/** Грузит один временной ряд (тренд). Перезапрашивается при смене метрики/гранулярности/валюты/периода. */
export function useTimeseries(params: TimeseriesParams) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<TimeseriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { metric, interval, currency, from, to } = params;

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const { signal } = controller;
    setIsLoading(true);
    setError(null);

    getTimeseries(token, { metric, interval, currency, from, to }, signal)
      .then((res) => {
        if (signal.aborted) return;
        setData(res);
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setData(null);
        setError('Не удалось загрузить тренд.');
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, metric, interval, currency, from, to]);

  return { data, isLoading, error };
}
