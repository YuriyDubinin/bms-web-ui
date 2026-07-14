import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type {
  CreateProjectInput,
  DeleteProjectResponse,
  Project,
  ProjectListParams,
  UpdateProjectInput,
} from '../model';
import { createProject, deleteProject, listProjects, updateProject } from './projectsApi';

export const PROJECTS_QUERY_KEY = ['projects'] as const;

export function useProjectsQuery(
  params: ProjectListParams,
): UseQueryResult<ListResponse<Project>, Error> {
  return useQuery<ListResponse<Project>, Error>({
    queryKey: [...PROJECTS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listProjects(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

/** Короткий список без пагинации UI — для select'ов привязки (services/clients/tasks/events). */
export function useAllProjectsQuery(): UseQueryResult<ListResponse<Project>, Error> {
  return useQuery<ListResponse<Project>, Error>({
    queryKey: [...PROJECTS_QUERY_KEY, 'all'],
    queryFn: ({ signal }) => listProjects({ page: 1, page_size: 100, sort_by: 'name', order: 'asc' }, signal),
    staleTime: 60_000,
  });
}

export function useCreateProject(): UseMutationResult<Project, Error, CreateProjectInput> {
  const qc = useQueryClient();
  return useMutation<Project, Error, CreateProjectInput>({
    mutationFn: createProject,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useUpdateProject(): UseMutationResult<Project, Error, UpdateProjectInput> {
  const qc = useQueryClient();
  return useMutation<Project, Error, UpdateProjectInput>({
    mutationFn: updateProject,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useDeleteProject(): UseMutationResult<DeleteProjectResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteProjectResponse, Error, string>({
    mutationFn: deleteProject,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
