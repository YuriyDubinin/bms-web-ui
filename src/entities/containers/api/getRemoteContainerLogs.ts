import { api } from '@shared/api';
import type { ContainerLogsRequest, ContainerLogsResponse } from '../model';

/**
 * POST /api/servers/remote/system/containers/logs — получение stdout/stderr
 * контейнера через SSH. Дефолтный клиентский таймаут 30 сек коротковат: на
 * больших логах (несколько МБ) операция может уйти за 3-4 сек, плюс SSH-handshake.
 * Поднимаем до 1 минуты — этого с запасом хватает на 10 МБ кольцевой буфер.
 */
export function getRemoteContainerLogs(
  body: ContainerLogsRequest,
  signal?: AbortSignal,
): Promise<ContainerLogsResponse> {
  return api.post<ContainerLogsResponse>(
    '/api/servers/remote/system/containers/logs',
    body,
    { signal, timeoutMs: 60_000 },
  );
}
