import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type { AttachTagInput, CreateTagInput, DeleteTagResponse, Tag, TagListParams, UpdateTagInput } from '../model';
import { attachTag, createTag, deleteTag, detachTag, listTags, updateTag } from './tagsApi';

export const TAGS_QUERY_KEY = ['tags'] as const;

export function useTagsQuery(params: TagListParams = {}): UseQueryResult<ListResponse<Tag>, Error> {
  return useQuery<ListResponse<Tag>, Error>({
    queryKey: [...TAGS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listTags(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateTag(): UseMutationResult<Tag, Error, CreateTagInput> {
  const qc = useQueryClient();
  return useMutation<Tag, Error, CreateTagInput>({
    mutationFn: createTag,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}

export function useUpdateTag(): UseMutationResult<Tag, Error, UpdateTagInput> {
  const qc = useQueryClient();
  return useMutation<Tag, Error, UpdateTagInput>({
    mutationFn: updateTag,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}

export function useDeleteTag(): UseMutationResult<DeleteTagResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteTagResponse, Error, string>({
    mutationFn: deleteTag,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}

export function useAttachTag(): UseMutationResult<{ status: 'ATTACHED' }, Error, AttachTagInput> {
  const qc = useQueryClient();
  return useMutation<{ status: 'ATTACHED' }, Error, AttachTagInput>({
    mutationFn: attachTag,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}

export function useDetachTag(): UseMutationResult<{ status: 'DETACHED' }, Error, AttachTagInput> {
  const qc = useQueryClient();
  return useMutation<{ status: 'DETACHED' }, Error, AttachTagInput>({
    mutationFn: detachTag,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}
