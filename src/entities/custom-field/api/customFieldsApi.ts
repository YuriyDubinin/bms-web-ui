import { api, buildQuery } from '@shared/api';
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

export function listDefinitions(
  params: CustomFieldDefinitionListParams,
  signal?: AbortSignal,
): Promise<{ items: CustomFieldDefinition[] }> {
  return api.get<{ items: CustomFieldDefinition[] }>(
    `/api/custom-fields/definitions/list${buildQuery(params)}`,
    { signal },
  );
}

export function createDefinition(input: CreateCustomFieldDefinitionInput): Promise<CustomFieldDefinition> {
  return api.post<CustomFieldDefinition>('/api/custom-fields/definitions/create', input);
}

export function updateDefinition(input: UpdateCustomFieldDefinitionInput): Promise<CustomFieldDefinition> {
  return api.put<CustomFieldDefinition>('/api/custom-fields/definitions/update', input);
}

export function deleteDefinition(id: string): Promise<DeleteCustomFieldDefinitionResponse> {
  return api.delete<DeleteCustomFieldDefinitionResponse>('/api/custom-fields/definitions/delete', { id });
}

export function setValue(input: SetCustomFieldValueInput): Promise<CustomFieldValue> {
  return api.post<CustomFieldValue>('/api/custom-fields/values/set', input);
}

export function listValues(entityId: string, signal?: AbortSignal): Promise<{ items: CustomFieldValue[] }> {
  return api.get<{ items: CustomFieldValue[] }>(
    `/api/custom-fields/values/list${buildQuery({ entity_id: entityId })}`,
    { signal },
  );
}

export function unsetValue(input: UnsetCustomFieldValueInput): Promise<{ status: 'REMOVED' }> {
  return api.delete<{ status: 'REMOVED' }>('/api/custom-fields/values/unset', input);
}
