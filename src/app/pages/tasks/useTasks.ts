import { useCallback, useEffect, useState } from 'react';
import { ApiError, listTasks, type Task } from '@app/api';
import { useAuth } from '@app/auth';

export type UseTasks = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export type UseTasksParams = {
  /** Ограничить выборку задачами этого проекта (серверный фильтр project_id). */
  projectId?: string;
  /** Ограничить выборку задачами этого клиента (серверный фильтр client_id). */
  clientId?: string;
};

/**
 * Загружает задачи организации (или конкретного проекта/клиента, если задан фильтр).
 * Берём целиком (page_size=100) и отдаём в клиентский DataTable — он сам делает поиск,
 * фильтрацию, сортировку и пагинацию. При 401 — разлогин через общий useAuth.
 */
export function useTasks({ projectId, clientId }: UseTasksParams = {}): UseTasks {
  const { token, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listTasks(
      token,
      {
        page: 1,
        page_size: 100,
        sort_by: 'created_at',
        order: 'desc',
        ...(projectId ? { project_id: projectId } : {}),
        ...(clientId ? { client_id: clientId } : {}),
      },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setTasks(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setError('Не удалось загрузить задачи. Попробуйте обновить страницу.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, reloadKey, projectId, clientId]);

  return { tasks, isLoading, error, reload };
}
