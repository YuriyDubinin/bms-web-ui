import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ServicesSnapshot } from '../model';
import { getServices } from './getServices';

export const SERVICES_QUERY_KEY = ['services', 'snapshot'] as const;

const POLL_INTERVAL_MS = 3000;

export function useServicesQuery(): UseQueryResult<ServicesSnapshot, Error> {
  return useQuery<ServicesSnapshot, Error>({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: ({ signal }) => getServices(signal),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
    placeholderData: (prev) => prev,
    // Polling-дашборд: при сбое показываем inline-состояние, без toast-спама.
    meta: { silent: true },
  });
}
