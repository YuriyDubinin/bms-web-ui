import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError, isAuthError } from './types';

/**
 * Хук на «прочие» ошибки в queries/mutations — auth-коды и 422 игнорируем
 * (их обрабатывают auth-interceptor и форма), остальное идёт сюда.
 * Регистрируется из app/providers/setupSession.
 */
export type QueryErrorHandler = (err: unknown) => void;

let queryErrorHandler: QueryErrorHandler | null = null;

export function setQueryErrorHandler(fn: QueryErrorHandler | null): void {
  queryErrorHandler = fn;
}

function shouldNotify(err: unknown): boolean {
  if (err instanceof ApiError) {
    if (isAuthError(err.code) || err.status === 401) return false;
    if (err.status === 422) return false;
  }
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            if (isAuthError(error.code) || error.status === 401 || error.status === 422)
              return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (err, query) => {
        // meta.silent — для polling-запросов: они показывают inline-состояние, тост не нужен.
        if (query.meta?.silent === true) return;
        if (shouldNotify(err)) queryErrorHandler?.(err);
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent === true) return;
        if (shouldNotify(err)) queryErrorHandler?.(err);
      },
    }),
  });
}
