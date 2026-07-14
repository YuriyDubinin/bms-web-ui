import { useCallback, useEffect, useState } from 'react';
import { ApiError, listProjects, type Project } from '@app/api';
import { useAuth } from '@app/auth';

export type UseProjects = {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Загружает список проектов организации. Проектов обычно немного, поэтому берём их
 * целиком (page_size=100) и отдаём в клиентский DataTable — он сам делает поиск,
 * фильтрацию, сортировку и пагинацию. При 401 — разлогин через общий useAuth.
 */
export function useProjects(): UseProjects {
  const { token, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listProjects(
      token,
      { page: 1, page_size: 100, sort_by: 'created_at', order: 'desc' },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setProjects(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setError('Не удалось загрузить проекты. Попробуйте обновить страницу.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, reloadKey]);

  return { projects, isLoading, error, reload };
}
