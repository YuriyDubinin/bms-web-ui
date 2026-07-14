import { z } from 'zod';
import { isValidJsonObject } from '@shared/lib';
import { PROJECT_STATUSES } from '@entities/project';

export const projectFormSchema = z.object({
  name: z.string().trim().min(2, 'Must be 2–255 characters').max(255, 'Too long'),
  slug: z.string().trim().max(100, 'Too long'),
  direction: z.string().trim().max(255, 'Too long'),
  description: z.string().trim().max(5000, 'Too long'),
  status: z.enum(PROJECT_STATUSES),
  attributes: z.string().refine(isValidJsonObject, 'Must be a valid JSON object'),
  starts_at: z.string(),
  ends_at: z.string(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const PROJECT_FORM_FIELDS = [
  'name',
  'slug',
  'direction',
  'description',
  'status',
  'attributes',
  'starts_at',
  'ends_at',
] as const;
