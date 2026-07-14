import { CUSTOM_FIELD_TYPES, type CustomFieldType } from './types';

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  BOOLEAN: 'Yes / No',
  DATE: 'Date',
  DATETIME: 'Date & time',
  JSON: 'JSON',
  SELECT: 'Select',
};

export const CUSTOM_FIELD_TYPE_OPTIONS = CUSTOM_FIELD_TYPES.map((t) => ({
  value: t,
  label: CUSTOM_FIELD_TYPE_LABELS[t],
}));

/** options.choices: string[] — единственная форма опций, которую понимает UI для SELECT. */
export function selectChoicesFromOptions(options: Record<string, unknown> | null): string[] {
  const choices = options?.choices;
  return Array.isArray(choices) ? choices.filter((c): c is string => typeof c === 'string') : [];
}
