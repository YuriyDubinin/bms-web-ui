import { useCallback, useEffect, useState } from 'react';
import { ApiError, listServices, type Service } from '@app/api';
import { useAuth } from '@app/auth';

export type UseServices = {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export type UseServicesParams = {
  /** Ограничить выборку услугами этого проекта (серверный фильтр project_id). */
  projectId?: string;
};

/**
 * Загружает каталог услуг организации (или конкретного проекта, если задан projectId).
 * Позиций обычно немного, поэтому берём их целиком (page_size=100) и отдаём в клиентский
 * DataTable — он сам делает поиск, фильтрацию, сортировку и пагинацию.
 * При 401 — разлогин через общий useAuth.
 */
export function useServices({ projectId }: UseServicesParams = {}): UseServices {
  const { token, logout } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listServices(
      token,
      {
        page: 1,
        page_size: 100,
        sort_by: 'created_at',
        order: 'desc',
        ...(projectId ? { project_id: projectId } : {}),
      },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setServices(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setError('Не удалось загрузить услуги. Попробуйте обновить страницу.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, reloadKey, projectId]);

  return { services, isLoading, error, reload };
}
