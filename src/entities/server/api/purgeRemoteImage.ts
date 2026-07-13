import { api } from '@shared/api';
import type { PurgeRequest, PurgeResponse } from '../model';

/**
 * POST /api/servers/remote/images/purge — удаление образа и всех связанных
 * контейнеров на удалённом сервере. Синхронная операция с пошаговым отчётом
 * в `result.steps[]`. Сетевые/auth-сбои — это 200 OK с `connected:false`.
 *
 * Таймаут поднят до 3 минут: `docker stop` может ждать graceful-shutdown до
 * 10 сек на каждый контейнер, плюс SSH-handshake.
 */
export function purgeRemoteImage(body: PurgeRequest): Promise<PurgeResponse> {
  return api.post<PurgeResponse>('/api/servers/remote/images/purge', body, {
    timeoutMs: 180_000,
  });
}
