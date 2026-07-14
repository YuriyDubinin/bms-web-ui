import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type { CreateLinkInput, DeleteLinkResponse, Link, LinkListParams } from '../model';
import { createLink, deleteLink, listLinks } from './linksApi';

export const LINKS_QUERY_KEY = ['links'] as const;

export function useLinksQuery(entityId: string | null): UseQueryResult<ListResponse<Link>, Error> {
  const params: LinkListParams = { entity_id: entityId ?? undefined, page: 1, page_size: 100 };
  return useQuery<ListResponse<Link>, Error>({
    queryKey: [...LINKS_QUERY_KEY, 'list', entityId],
    queryFn: ({ signal }) => listLinks(params, signal),
    enabled: !!entityId,
    staleTime: 10_000,
  });
}

export function useCreateLink(): UseMutationResult<Link, Error, CreateLinkInput> {
  const qc = useQueryClient();
  return useMutation<Link, Error, CreateLinkInput>({
    mutationFn: createLink,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
    },
  });
}

export function useDeleteLink(): UseMutationResult<DeleteLinkResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteLinkResponse, Error, string>({
    mutationFn: deleteLink,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
    },
  });
}
