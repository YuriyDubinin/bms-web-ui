import { api, buildQuery, type ListResponse } from '@shared/api';
import type {
  CreateProjectInput,
  DeleteProjectResponse,
  Project,
  ProjectListParams,
  UpdateProjectInput,
} from '../model';

export function listProjects(
  params: ProjectListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Project>> {
  return api.get<ListResponse<Project>>(`/api/projects/list${buildQuery(params)}`, { signal });
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return api.post<Project>('/api/projects/create', input);
}

export function updateProject(input: UpdateProjectInput): Promise<Project> {
  return api.put<Project>('/api/projects/update', input);
}

export function deleteProject(id: string): Promise<DeleteProjectResponse> {
  return api.delete<DeleteProjectResponse>('/api/projects/delete', { id });
}
