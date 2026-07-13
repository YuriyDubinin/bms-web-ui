import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SystemSnapshot } from '../model';
import { getSystem } from './getSystem';

export const SYSTEM_QUERY_KEY = ['system', 'snapshot'] as const;

/** Интервал поллинга. 3 секунды — middle ground между live-фидбэком и нагрузкой. */
const POLL_INTERVAL_MS = 3000;

export function useSystemQuery(): UseQueryResult<SystemSnapshot, Error> {
  return useQuery<SystemSnapshot, Error>({
    queryKey: SYSTEM_QUERY_KEY,
    queryFn: ({ signal }) => getSystem(signal),
    refetchInterval: POLL_INTERVAL_MS,
    // Дашборд имеет смысл держать живым даже когда вкладка в фоне (типичный ops-кейс).
    refetchIntervalInBackground: true,
    staleTime: 0,
    // Сохраняем предыдущий снапшот во время refetch — без «мигания» в loading.
    placeholderData: (prev) => prev,
    // Polling-дашборд: ошибки показываем inline (CoreError), без toast-спама каждые 3с.
    meta: { silent: true },
  });
}
