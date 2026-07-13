import { useEffect } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { pingServer } from './serversApi';
import { SERVERS_QUERY_KEY } from './useServers';
import type { ServerPingResult } from '../model';

/** Ключ под polling-ping. Намеренно НЕ под SERVERS_QUERY_KEY, чтобы инвалидация
 *  списка серверов не дёргала пинг и не запускала бесконечный цикл. */
export const SERVER_PING_POLLING_KEY = ['server-ping'] as const;

const POLL_INTERVAL_MS = 3000;

/**
 * Фоновый пинг сервера раз в 3 секунды — пока вкладка открыта и видима.
 * Каждый успешный пинг обновляет `last_status` / `is_active` на бэке и
 * инвалидирует список серверов в кеше, чтобы индикатор живости («active»
 * pulse + бейдж last_status) в UI оставался свежим.
 */
export function usePingPolling(
  id: string | undefined,
  enabled = true,
): UseQueryResult<ServerPingResult, Error> {
  const qc = useQueryClient();
  const query = useQuery<ServerPingResult, Error>({
    queryKey: [...SERVER_PING_POLLING_KEY, id],
    queryFn: ({ signal: _ }) => pingServer(id as string),
    enabled: !!id && enabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
    meta: { silent: true },
  });

  // На каждый успешный тик инвалидируем список серверов — фактически
  // обновляем last_status / is_active для подписчиков `useServersQuery`.
  useEffect(() => {
    if (query.isSuccess) {
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    }
  }, [query.isSuccess, query.dataUpdatedAt, qc]);

  return query;
}
