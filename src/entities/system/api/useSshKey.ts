import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { SshCheckResult, SshDeleteResponse, SshKeyInfo } from '../model';
import { createSshKey, deleteSshKey, getSshCheck } from './sshKey';

export const SSH_KEY_QUERY_KEY = ['system', 'ssh'] as const;

/**
 * Проверка ключа на маунте страницы и после мутаций (create/delete его инвалидируют).
 * Интервального поллинга нет — проверять постоянно не нужно.
 */
export function useSshCheckQuery(): UseQueryResult<SshCheckResult, Error> {
  return useQuery<SshCheckResult, Error>({
    queryKey: SSH_KEY_QUERY_KEY,
    queryFn: ({ signal }) => getSshCheck(signal),
    staleTime: 30_000,
    meta: { silent: true }, // состояние показываем индикатором, без toast
  });
}

export function useCreateSshKey(): UseMutationResult<SshKeyInfo, Error, void> {
  const qc = useQueryClient();
  return useMutation<SshKeyInfo, Error, void>({
    mutationFn: () => createSshKey(),
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SSH_KEY_QUERY_KEY });
    },
  });
}

export function useDeleteSshKey(): UseMutationResult<SshDeleteResponse, Error, void> {
  const qc = useQueryClient();
  return useMutation<SshDeleteResponse, Error, void>({
    mutationFn: () => deleteSshKey(),
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SSH_KEY_QUERY_KEY });
    },
  });
}
