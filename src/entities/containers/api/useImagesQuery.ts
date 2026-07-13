import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ImagesSnapshot } from '../model';
import { getImages } from './getImages';

export const IMAGES_QUERY_KEY = ['images', 'snapshot'] as const;

/**
 * Локальные Docker-образы (на машине, где работает API).
 * Без интервального поллинга — образы меняются редко, опрашиваем один раз
 * на маунт, дальше держим в кеше 30 секунд.
 */
export function useImagesQuery(): UseQueryResult<ImagesSnapshot, Error> {
  return useQuery<ImagesSnapshot, Error>({
    queryKey: IMAGES_QUERY_KEY,
    queryFn: ({ signal }) => getImages(signal),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    meta: { silent: true },
  });
}
