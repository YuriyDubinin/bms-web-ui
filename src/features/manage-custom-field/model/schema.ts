import { z } from 'zod';
import { isValidJsonObject } from '@shared/lib';
import { CUSTOM_FIELD_TYPES } from '@entities/custom-field';

export const customFieldDefinitionFormSchema = z.object({
  field_key: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(100, 'Too long')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, digits and underscore only'),
  label: z.string().trim().min(1, 'Required').max(255, 'Too long'),
  field_type: z.enum(CUSTOM_FIELD_TYPES),
  /** Для SELECT — список вариантов через запятую; сериализуется в {choices:[...]}. */
  choices: z.string(),
  is_required: z.boolean(),
  sort_order: z
    .string()
    .trim()
    .refine((v) => v === '' || /^-?\d+$/.test(v), 'Must be a whole number'),
});

export type CustomFieldDefinitionFormValues = z.infer<typeof customFieldDefinitionFormSchema>;

// Общий JSON-редактор options для не-SELECT типов (когда нужно что-то нестандартное).
export const customFieldOptionsJsonSchema = z.string().refine(isValidJsonObject, 'Must be a valid JSON object');
