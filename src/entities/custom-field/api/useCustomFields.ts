import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreateCustomFieldDefinitionInput,
  CustomFieldDefinition,
  CustomFieldDefinitionListParams,
  CustomFieldValue,
  DeleteCustomFieldDefinitionResponse,
  SetCustomFieldValueInput,
  UnsetCustomFieldValueInput,
  UpdateCustomFieldDefinitionInput,
} from '../model';
import {
  createDefinition,
  deleteDefinition,
  listDefinitions,
  listValues,
  setValue,
  unsetValue,
  updateDefinition,
} from './customFieldsApi';

export const CUSTOM_FIELD_DEFINITIONS_QUERY_KEY = ['custom-field-definitions'] as const;
export const CUSTOM_FIELD_VALUES_QUERY_KEY = ['custom-field-values'] as const;

export function useDefinitionsQuery(
  params: CustomFieldDefinitionListParams,
): UseQueryResult<{ items: CustomFieldDefinition[] }, Error> {
  return useQuery<{ items: CustomFieldDefinition[] }, Error>({
    queryKey: [...CUSTOM_FIELD_DEFINITIONS_QUERY_KEY, params],
    queryFn: ({ signal }) => listDefinitions(params, signal),
    staleTime: 30_000,
  });
}

export function useCreateDefinition(): UseMutationResult<CustomFieldDefinition, Error, CreateCustomFieldDefinitionInput> {
  const qc = useQueryClient();
  return useMutation<CustomFieldDefinition, Error, CreateCustomFieldDefinitionInput>({
    mutationFn: createDefinition,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOM_FIELD_DEFINITIONS_QUERY_KEY });
    },
  });
}

export function useUpdateDefinition(): UseMutationResult<CustomFieldDefinition, Error, UpdateCustomFieldDefinitionInput> {
  const qc = useQueryClient();
  return useMutation<CustomFieldDefinition, Error, UpdateCustomFieldDefinitionInput>({
    mutationFn: updateDefinition,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOM_FIELD_DEFINITIONS_QUERY_KEY });
    },
  });
}

export function useDeleteDefinition(): UseMutationResult<DeleteCustomFieldDefinitionResponse, Error, string> {
  const qc = useQueryClient();
  return useMutation<DeleteCustomFieldDefinitionResponse, Error, string>({
    mutationFn: deleteDefinition,
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOM_FIELD_DEFINITIONS_QUERY_KEY });
    },
  });
}

export function useValuesQuery(entityId: string | null): UseQueryResult<{ items: CustomFieldValue[] }, Error> {
  return useQuery<{ items: CustomFieldValue[] }, Error>({
    queryKey: [...CUSTOM_FIELD_VALUES_QUERY_KEY, entityId],
    queryFn: ({ signal }) => listValues(entityId as string, signal),
    enabled: !!entityId,
    staleTime: 10_000,
  });
}

export function useSetValue(): UseMutationResult<CustomFieldValue, Error, SetCustomFieldValueInput> {
  const qc = useQueryClient();
  return useMutation<CustomFieldValue, Error, SetCustomFieldValueInput>({
    mutationFn: setValue,
    meta: { silent: true },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...CUSTOM_FIELD_VALUES_QUERY_KEY, vars.entity_id] });
    },
  });
}

export function useUnsetValue(): UseMutationResult<{ status: 'REMOVED' }, Error, UnsetCustomFieldValueInput> {
  const qc = useQueryClient();
  return useMutation<{ status: 'REMOVED' }, Error, UnsetCustomFieldValueInput>({
    mutationFn: unsetValue,
    meta: { silent: true },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...CUSTOM_FIELD_VALUES_QUERY_KEY, vars.entity_id] });
    },
  });
}
