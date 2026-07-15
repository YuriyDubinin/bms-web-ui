import { useEffect, useState } from 'react';
import { ApiError, listUsers, type User } from '@app/api';
import { useAuth } from '@app/auth';

export type UseUsers = {
  users: User[];
  isLoading: boolean;
};

/**
 * Загружает операторов организации — для селекта исполнителя задачи и резолва его имени.
 * Операторов немного, берём целиком (page_size=100). Ошибку загрузки не эскалируем:
 * без списка операторов задачи всё равно создаются (исполнитель необязателен).
 */
export function useUsers(): UseUsers {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);

    listUsers(token, { page: 1, page_size: 100 }, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setUsers(res.items);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) void logout();
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [token, logout]);

  return { users, isLoading };
}
