import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { RemoteSystemResult } from '../model/remote';
import { getRemoteSystem } from './remoteSystem';

export const REMOTE_SYSTEM_QUERY_KEY = ['system', 'remote'] as const;

/** Интервал поллинга — синхронно с Core/Main, чтобы графики/дельты жили одинаково. */
const POLL_INTERVAL_MS = 3000;

/**
 * Снимок состояния удалённого сервера через SSH. Поллится каждые 3 секунды
 * **только пока вкладка видима** — иначе ushli бы дорогие SSH-handshake'и фоном.
 * `placeholderData: (prev) => prev` исключает мигание скелетона между опросами.
 */
export function useRemoteSystemQuery(
  id: string | undefined,
  enabled = true,
): UseQueryResult<RemoteSystemResult, Error> {
  return useQuery<RemoteSystemResult, Error>({
    queryKey: [...REMOTE_SYSTEM_QUERY_KEY, id],
    queryFn: ({ signal }) => getRemoteSystem(id as string, signal),
    enabled: !!id && enabled,
    refetchInterval: POLL_INTERVAL_MS,
    // false — SSH-handshake дорог; в фоне не поллим, только на активной вкладке.
    refetchIntervalInBackground: false,
    staleTime: 0,
    placeholderData: (prev) => prev,
    retry: false,
    // Connected/status интерпретируем сами; ошибки HTTP-уровня (404/422/500)
    // показываем inline-карточкой, без глобального toast.
    meta: { silent: true },
  });
}
