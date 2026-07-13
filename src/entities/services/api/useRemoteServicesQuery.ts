import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@shared/api';
import type { ServicesSnapshot } from '../model';

export const REMOTE_SERVICES_QUERY_KEY = ['services', 'remote'] as const;

/** Интервал поллинга — синхронно с remote/system/main. */
const POLL_INTERVAL_MS = 3000;

/**
 * Обёртка ответа POST /api/servers/remote/system/services. JSON payload `services`
 * совпадает 1-в-1 с локальным /api/system/services; различается только конверт.
 */
type RemoteServicesResult = {
  id: string;
  connected: boolean;
  method?: string;
  status: string;
  message: string;
  checked_at: string;
  services?: ServicesSnapshot;
};

async function getRemoteServices(
  id: string,
  signal?: AbortSignal,
): Promise<RemoteServicesResult> {
  const raw = await api.post<RemoteServicesResult>(
    '/api/servers/remote/system/services/list',
    { id },
    { signal },
  );
  // Нормализация nullable массивов при успешном коннекте.
  if (raw.services) {
    const s = raw.services as ServicesSnapshot & {
      services: ServicesSnapshot['services'] | null;
      errors?: ServicesSnapshot['errors'] | null;
    };
    return {
      ...raw,
      services: {
        ...raw.services,
        services: s.services ?? [],
        errors: s.errors ?? [],
      },
    };
  }
  return raw;
}

/**
 * Снапшот systemd-сервисов удалённого сервера через SSH. Поллится 3с, только пока
 * вкладка активна. При SSH-провале (connected:false) `select` синтезирует
 * «unavailable»-снимок, чтобы переиспользовать тот же `ServicesPanel`.
 */
export function useRemoteServicesQuery(
  id: string | undefined,
  enabled = true,
): UseQueryResult<ServicesSnapshot, Error> {
  return useQuery<RemoteServicesResult, Error, ServicesSnapshot>({
    queryKey: [...REMOTE_SERVICES_QUERY_KEY, id],
    queryFn: ({ signal }) => getRemoteServices(id as string, signal),
    enabled: !!id && enabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    placeholderData: (prev) => prev,
    retry: false,
    meta: { silent: true },
    select: (result): ServicesSnapshot => {
      if (!result.connected) {
        return {
          available: false,
          reason: `${result.status}: ${result.message}`,
          collected_at: result.checked_at,
          manager: null,
          count: 0,
          services: [],
        };
      }
      return result.services as ServicesSnapshot;
    },
  });
}
