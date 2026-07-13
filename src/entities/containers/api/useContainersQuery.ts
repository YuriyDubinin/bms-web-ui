import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ContainersSnapshot } from '../model';
import { getContainers } from './getContainers';

export const CONTAINERS_QUERY_KEY = ['containers', 'snapshot'] as const;

const POLL_INTERVAL_MS = 3000;

export function useContainersQuery(): UseQueryResult<ContainersSnapshot, Error> {
  return useQuery<ContainersSnapshot, Error>({
    queryKey: CONTAINERS_QUERY_KEY,
    queryFn: ({ signal }) => getContainers(signal),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
    placeholderData: (prev) => prev,
    // Polling-дашборд: не шумим toast'ом при сбое, показываем inline-состояние.
    meta: { silent: true },
  });
}
