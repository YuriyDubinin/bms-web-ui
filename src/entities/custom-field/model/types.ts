import type { EntityType, SortOrder } from '@shared/api';

export const CUSTOM_FIELD_TYPES = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'SELECT'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type CustomFieldDefinition = {
  id: string;
  entity_type: EntityType;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: Record<string, unknown> | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
};

export type CreateCustomFieldDefinitionInput = {
  entity_type: EntityType;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options?: Record<string, unknown>;
  is_required?: boolean;
  sort_order?: number;
};

export type UpdateCustomFieldDefinitionInput = {
  id: string;
  label: string;
  field_type: CustomFieldType;
  options?: Record<string, unknown>;
  is_required?: boolean;
  sort_order?: number;
};

export type CustomFieldDefinitionListParams = {
  entity_type?: EntityType;
  order?: SortOrder;
};

export type DeleteCustomFieldDefinitionResponse = {
  id: string;
  status: 'DELETED';
};

export type CustomFieldValue = {
  field_definition_id: string;
  value: unknown;
};

export type SetCustomFieldValueInput = {
  entity_id: string;
  field_definition_id: string;
  value: unknown;
};

export type UnsetCustomFieldValueInput = {
  entity_id: string;
  field_definition_id: string;
};
