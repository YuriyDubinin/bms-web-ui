import { useCallback, useEffect, useState } from 'react';
import { ApiError, listClients, type Client } from '@app/api';
import { useAuth } from '@app/auth';

export type UseClients = {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export type UseClientsParams = {
  /** Ограничить выборку клиентами этого проекта (серверный фильтр project_id). */
  projectId?: string;
};

/**
 * Загружает клиентов организации (или конкретного проекта, если задан projectId).
 * Берём целиком (page_size=100) и отдаём в клиентский DataTable — он сам делает поиск,
 * фильтрацию, сортировку и пагинацию. При 401 — разлогин через общий useAuth.
 */
export function useClients({ projectId }: UseClientsParams = {}): UseClients {
  const { token, logout } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listClients(
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
        setClients(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setError('Не удалось загрузить клиентов. Попробуйте обновить страницу.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout, reloadKey, projectId]);

  return { clients, isLoading, error, reload };
}
