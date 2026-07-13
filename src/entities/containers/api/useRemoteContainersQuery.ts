import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@shared/api';
import type { ContainersSnapshot } from '../model';

export const REMOTE_CONTAINERS_QUERY_KEY = ['containers', 'remote'] as const;

/** Интервал поллинга — синхронно с remote/system/main. */
const POLL_INTERVAL_MS = 3000;

/**
 * Обёртка ответа POST /api/servers/remote/system/containers. JSON payload `containers`
 * совпадает 1-в-1 с локальным /api/system/containers; различается только конверт.
 */
type RemoteContainersResult = {
  id: string;
  connected: boolean;
  method?: string;
  status: string;
  message: string;
  checked_at: string;
  containers?: ContainersSnapshot;
};

async function getRemoteContainers(
  id: string,
  signal?: AbortSignal,
): Promise<RemoteContainersResult> {
  const raw = await api.post<RemoteContainersResult>(
    '/api/servers/remote/system/containers/list',
    { id },
    { signal },
  );
  // Нормализация nullable массивов — если коннект был успешным.
  if (raw.containers) {
    const c = raw.containers as ContainersSnapshot & {
      containers: ContainersSnapshot['containers'] | null;
      errors?: ContainersSnapshot['errors'] | null;
    };
    return {
      ...raw,
      containers: {
        ...raw.containers,
        containers: c.containers ?? [],
        errors: c.errors ?? [],
      },
    };
  }
  return raw;
}

/**
 * Снапшот контейнеров удалённого сервера через SSH. Поллится 3с, только пока
 * вкладка активна (`refetchIntervalInBackground: false`). При SSH-провале
 * (connected:false) `select` синтезирует «unavailable»-снимок с человекочитаемой
 * `reason`, чтобы переиспользовать тот же `ContainersPanel`.
 */
export function useRemoteContainersQuery(
  id: string | undefined,
  enabled = true,
): UseQueryResult<ContainersSnapshot, Error> {
  return useQuery<RemoteContainersResult, Error, ContainersSnapshot>({
    queryKey: [...REMOTE_CONTAINERS_QUERY_KEY, id],
    queryFn: ({ signal }) => getRemoteContainers(id as string, signal),
    enabled: !!id && enabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    placeholderData: (prev) => prev,
    retry: false,
    meta: { silent: true },
    select: (result): ContainersSnapshot => {
      if (!result.connected) {
        // SSH-провал → «unavailable» с понятной причиной для UI.
        return {
          available: false,
          reason: `${result.status}: ${result.message}`,
          collected_at: result.checked_at,
          engine: null,
          count: 0,
          containers: [],
        };
      }
      return result.containers as ContainersSnapshot;
    },
  });
}
