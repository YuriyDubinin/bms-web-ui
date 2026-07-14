import { api, buildQuery, type ListResponse } from '@shared/api';
import type { AttachTagInput, CreateTagInput, DeleteTagResponse, Tag, TagListParams, UpdateTagInput } from '../model';

export function listTags(params: TagListParams, signal?: AbortSignal): Promise<ListResponse<Tag>> {
  return api.get<ListResponse<Tag>>(`/api/tags/list${buildQuery(params)}`, { signal });
}

export function createTag(input: CreateTagInput): Promise<Tag> {
  return api.post<Tag>('/api/tags/create', input);
}

export function updateTag(input: UpdateTagInput): Promise<Tag> {
  return api.put<Tag>('/api/tags/update', input);
}

export function deleteTag(id: string): Promise<DeleteTagResponse> {
  return api.delete<DeleteTagResponse>('/api/tags/delete', { id });
}

export function attachTag(input: AttachTagInput): Promise<{ status: 'ATTACHED' }> {
  return api.post<{ status: 'ATTACHED' }>('/api/tags/attach', input);
}

export function detachTag(input: AttachTagInput): Promise<{ status: 'DETACHED' }> {
  return api.delete<{ status: 'DETACHED' }>('/api/tags/detach', input);
}
