import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ContainerLogsRequest, ContainerLogsResponse } from '../model';
import { getRemoteContainerLogs } from './getRemoteContainerLogs';

export const REMOTE_CONTAINER_LOGS_QUERY_KEY = ['containers', 'remote-logs'] as const;

/**
 * Загрузка логов одного контейнера с удалённого сервера. Запрос идёт при
 * монтировании (когда модалка открыта) и переисполняется при изменении любого
 * параметра фильтрации. Поллинга нет — обновление по кнопке Refresh (refetch).
 */
export function useRemoteContainerLogsQuery(
  body: ContainerLogsRequest,
  enabled = true,
): UseQueryResult<ContainerLogsResponse, Error> {
  return useQuery<ContainerLogsResponse, Error>({
    queryKey: [...REMOTE_CONTAINER_LOGS_QUERY_KEY, body],
    queryFn: ({ signal }) => getRemoteContainerLogs(body, signal),
    enabled: !!body.server_id && !!body.container && enabled,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    meta: { silent: true },
  });
}
