import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  getCalendarAgenda,
  listDeals,
  listProcesses,
  listProjects,
  listTasks,
  type AgendaItem,
  type CalendarEntityType,
  type Deal,
  type DealStatus,
  type DealType,
  type Process,
  type ProcessStatus,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@app/api';
import { useAuth } from '@app/auth';

/** Видимость слоёв — какие типы сущностей показывать на сетке. */
export type Layers = { task: boolean; deal: boolean; project: boolean; process: boolean };

/** Набор фильтров календаря: окно + атрибутивные фильтры по каждому слою. */
export type CalendarFilters = {
  layers: Layers;
  /** Исполнитель/ответственный (общий для задач и сделок). */
  assignedTo: string;
  /** Проект (общий фильтр для задач и сделок). */
  projectId: string;
  taskStatus: TaskStatus | '';
  taskPriority: TaskPriority | '';
  dealStatus: DealStatus | '';
  dealType: DealType | '';
  projectStatus: ProjectStatus | '';
  processStatus: ProcessStatus | '';
};

export type CalendarRange = { from: string; to: string };

/** Сколько элементов тянуть на окно (лимит бэкенда — 1000 на тип; месяцу хватает с запасом). */
const WINDOW_PAGE_SIZE = 500;

function isUnauthorized(r: PromiseSettledResult<unknown>): boolean {
  return r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401;
}
function value<T>(r: PromiseSettledResult<T[]>): T[] {
  return r.status === 'fulfilled' ? r.value : [];
}

/**
 * Данные сетки (месяц/неделя/день): грузит включённые слои per-entity списками с оконными
 * и атрибутивными фильтрами. Именно списки (а не agenda) дают ПОЛНЫЕ объекты — они нужны
 * для drag&drop (PUT = полная замена) и для открытия формы редактирования.
 * Через allSettled: падение одного слоя не гасит остальные.
 */
export function useCalendarGrid(range: CalendarRange, filters: CalendarFilters, active: boolean) {
  const { token, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const { from, to } = range;
  const {
    layers,
    assignedTo,
    projectId,
    taskStatus,
    taskPriority,
    dealStatus,
    dealType,
    projectStatus,
    processStatus,
  } = filters;
  const showTask = layers.task;
  const showDeal = layers.deal;
  const showProject = layers.project;
  const showProcess = layers.process;

  useEffect(() => {
    if (!token || !active || !from || !to) return;
    const controller = new AbortController();
    const { signal } = controller;
    setIsLoading(true);
    setError(null);

    const taskJob: Promise<Task[]> = showTask
      ? listTasks(
          token,
          {
            due_after: from,
            due_before: to,
            page_size: WINDOW_PAGE_SIZE,
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
            ...(projectId ? { project_id: projectId } : {}),
            ...(taskStatus ? { status: taskStatus } : {}),
            ...(taskPriority ? { priority: taskPriority } : {}),
          },
          signal,
        ).then((r) => r.items)
      : Promise.resolve([]);

    const dealJob: Promise<Deal[]> = showDeal
      ? listDeals(
          token,
          {
            close_from: from,
            close_to: to,
            page_size: WINDOW_PAGE_SIZE,
            ...(assignedTo ? { assigned_to: assignedTo } : {}),
            ...(projectId ? { project_id: projectId } : {}),
            ...(dealStatus ? { status: dealStatus } : {}),
            ...(dealType ? { type: dealType } : {}),
          },
          signal,
        ).then((r) => r.items)
      : Promise.resolve([]);

    const projectJob: Promise<Project[]> = showProject
      ? listProjects(
          token,
          {
            from,
            to,
            page_size: WINDOW_PAGE_SIZE,
            ...(projectStatus ? { status: projectStatus } : {}),
          },
          signal,
        ).then((r) => r.items)
      : Promise.resolve([]);

    const processJob: Promise<Process[]> = showProcess
      ? listProcesses(
          token,
          {
            from,
            to,
            page_size: WINDOW_PAGE_SIZE,
            ...(projectId ? { project_id: projectId } : {}),
            ...(processStatus ? { status: processStatus } : {}),
          },
          signal,
        ).then((r) => r.items)
      : Promise.resolve([]);

    Promise.allSettled([taskJob, dealJob, projectJob, processJob])
      .then((results) => {
        if (signal.aborted) return;
        if (results.some(isUnauthorized)) {
          void logout();
          return;
        }
        setTasks(value(results[0] as PromiseSettledResult<Task[]>));
        setDeals(value(results[1] as PromiseSettledResult<Deal[]>));
        setProjects(value(results[2] as PromiseSettledResult<Project[]>));
        setProcesses(value(results[3] as PromiseSettledResult<Process[]>));

        // Ошибка — только если все ВКЛЮЧЁННЫЕ слои упали (частичный сбой не гасит сетку).
        const enabled = [showTask, showDeal, showProject, showProcess];
        const enabledResults = results.filter((_, i) => enabled[i]);
        if (enabledResults.length > 0 && enabledResults.every((r) => r.status === 'rejected')) {
          setError('Не удалось загрузить события календаря. Попробуйте обновить.');
        }
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [
    token,
    logout,
    active,
    from,
    to,
    showTask,
    showDeal,
    showProject,
    showProcess,
    assignedTo,
    projectId,
    taskStatus,
    taskPriority,
    dealStatus,
    dealType,
    projectStatus,
    processStatus,
    reloadKey,
  ]);

  return { tasks, deals, projects, processes, isLoading, error, reload };
}

/**
 * Данные режима «Повестка»: главный агрегатор GET /calendar/agenda — все датированные
 * сущности окна одним запросом (лёгкий единый список; фильтр только по слоям через types).
 */
export function useCalendarAgenda(range: CalendarRange, layers: Layers, active: boolean) {
  const { token, logout } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const { from, to } = range;
  const { task, deal, project, process } = layers;

  useEffect(() => {
    if (!token || !active || !from || !to) return;
    const controller = new AbortController();
    const { signal } = controller;
    setIsLoading(true);
    setError(null);

    const types: CalendarEntityType[] = [];
    if (task) types.push('task');
    if (deal) types.push('deal');
    if (project) types.push('project');
    if (process) types.push('process');

    getCalendarAgenda(token, { from, to, types }, signal)
      .then((res) => {
        if (!signal.aborted) setItems(res);
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setItems([]);
        setError('Не удалось загрузить повестку. Попробуйте обновить.');
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, active, from, to, task, deal, project, process, reloadKey]);

  return { items, isLoading, error, reload };
}
