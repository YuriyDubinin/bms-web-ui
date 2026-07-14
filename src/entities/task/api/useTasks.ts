import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ListResponse } from '@shared/api';
import type {
  CreateTaskInput,
  DeleteTaskResponse,
  Task,
  TaskListParams,
  UpdateTaskInput,
} from '../model';
import { createTask, deleteTask, listTasks, updateTask } from './tasksApi';

export const TASKS_QUERY_KEY = ['tasks'] as const;

export function useTasksQuery(params: TaskListParams): UseQueryResult<ListResponse<Task>, Error> {
  return useQuery<ListResponse<Task>, Error>({
    queryKey: [...TASKS_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) => listTasks(params, signal),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateTask(): UseMutationResult<Task, Error, CreateTaskInput> {
  const qc = useQueryClient();
  return useMutation<Task, Error, CreateTaskInput>({
    mutationFn: createTask,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useUpdateTask(): UseMutationResult<Task, Error, UpdateTaskInput> {
  const qc = useQueryClient();
  return useMutation<Task, Error, UpdateTaskInput>({
    mutationFn: updateTask,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

export function useDeleteTask(): UseMutationResult<DeleteTaskResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteTaskResponse, Error, string>({
    mutationFn: deleteTask,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}
