import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { deployRemoteServer } from './deployRemoteServer';
import { SERVERS_QUERY_KEY } from './useServers';
import type { DeployRequest, DeployResponse } from '../model';

/**
 * Деплой контейнера на удалённый сервер. После любого ответа инвалидирует список
 * серверов (обновится `last_status` / `last_checked_at`). Инвалидацию списка
 * удалённых контейнеров — делает потребитель в feature-слое (FSD: entity не
 * импортирует другую entity). Результат и ошибки по шагам интерпретируем в
 * UI диалога, поэтому `meta:{silent:true}` — глобальный toast не нужен.
 */
export function useDeployRemoteServer(): UseMutationResult<DeployResponse, Error, DeployRequest> {
  const qc = useQueryClient();
  return useMutation<DeployResponse, Error, DeployRequest>({
    mutationFn: deployRemoteServer,
    meta: { silent: true },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SERVERS_QUERY_KEY });
    },
  });
}
