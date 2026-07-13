import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { purgeRemoteImage } from './purgeRemoteImage';
import { SERVERS_QUERY_KEY } from './useServers';
import type { PurgeRequest, PurgeResponse } from '../model';

/**
 * Очистка образа и связанных контейнеров на удалённом сервере. После любого
 * ответа инвалидирует список серверов (обновится `last_status`). Инвалидацию
 * списка удалённых контейнеров делает потребитель в feature-слое (FSD: entity
 * не импортирует другую entity). Результат/ошибки по шагам интерпретируем в
 * UI диалога — `meta:{silent:true}`.
 */
export function usePurgeRemoteImage(): UseMutationResult<PurgeResponse, Error, PurgeRequest> {
  const qc = useQueryClient();
  return useMutation<PurgeResponse, Error, PurgeRequest>({
    mutationFn: purgeRemoteImage,
    meta: { silent: true },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}
