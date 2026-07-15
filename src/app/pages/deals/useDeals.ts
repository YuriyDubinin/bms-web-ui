import { useCallback, useEffect, useState } from 'react';
import { ApiError, listDeals, type Deal } from '@app/api';
import { useAuth } from '@app/auth';

export type UseDeals = {
  deals: Deal[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export type UseDealsParams = {
  /** Ограничить выборку сделками этого проекта (серверный фильтр project_id). */
  projectId?: string;
  /** Ограничить выборку сделками этого клиента (серверный фильтр client_id). */
  clientId?: string;
};

/**
 * Загружает сделки организации (или конкретного проекта/клиента, если задан фильтр).
 * Берём целиком (page_size=100) и отдаём в клиентский DataTable — он сам делает поиск,
 * фильтрацию, сортировку и пагинацию. При 401 — разлогин через общий useAuth.
 */
export function useDeals({ projectId, clientId }: UseDealsParams = {}): UseDeals {
  const { token, logout } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listDeals(
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
        setDeals(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setError('Не удалось загрузить сделки. Попробуйте обновить страницу.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, reloadKey, projectId, clientId]);

  return { deals, isLoading, error, reload };
}
