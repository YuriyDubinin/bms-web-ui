import { api, buildQuery, type ListResponse } from '@shared/api';
import type { CreateLinkInput, DeleteLinkResponse, Link, LinkListParams } from '../model';

export function listLinks(params: LinkListParams, signal?: AbortSignal): Promise<ListResponse<Link>> {
  return api.get<ListResponse<Link>>(`/api/links/list${buildQuery(params)}`, { signal });
}

export function createLink(input: CreateLinkInput): Promise<Link> {
  return api.post<Link>('/api/links/create', input);
}

export function deleteLink(id: string): Promise<DeleteLinkResponse> {
  return api.delete<DeleteLinkResponse>('/api/links/delete', { id });
}
