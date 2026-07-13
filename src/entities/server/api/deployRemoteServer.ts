import { api } from '@shared/api';
import type { DeployRequest, DeployResponse } from '../model';

/**
 * POST /api/servers/remote/deploy — синхронный деплой контейнера на удалённый
 * сервер. Возвращает обёртку с пошаговым отчётом в `result.steps[]`. Сетевые
 * /auth-сбои — это 200 OK с `connected:false` (без `result`).
 *
 * Поднимаем клиентский таймаут до 5 минут: на спецификации до 60с,
 * но крупный `docker pull` через медленный канал реально может занять и больше.
 * Дефолтные 30с клиента сюда не подходят — фронт обрывает запрос раньше,
 * чем бэк успевает ответить, а деплой при этом продолжает идти на сервере.
 */
export function deployRemoteServer(body: DeployRequest): Promise<DeployResponse> {
  return api.post<DeployResponse>('/api/servers/remote/deploy', body, {
    timeoutMs: 300_000,
  });
}
