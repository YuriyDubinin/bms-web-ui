import { z } from 'zod';
import { isValidJsonObject } from '@shared/lib';
import { SERVICE_STATUSES } from '@entities/service';

export const serviceFormSchema = z.object({
  project_id: z.string(),
  name: z.string().trim().min(2, 'Must be 2–255 characters').max(255, 'Too long'),
  category: z.string().trim().max(255, 'Too long'),
  description: z.string().trim().max(5000, 'Too long'),
  price: z
    .string()
    .trim()
    .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Must be ≥ 0'),
  currency: z
    .string()
    .trim()
    .refine((v) => v === '' || v.length === 3, 'Must be a 3-letter code'),
  duration_min: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v >= 1), 'Must be ≥ 1'),
  status: z.enum(SERVICE_STATUSES),
  attributes: z.string().refine(isValidJsonObject, 'Must be a valid JSON object'),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const SERVICE_FORM_FIELDS = [
  'project_id',
  'name',
  'category',
  'description',
  'price',
  'currency',
  'duration_min',
  'status',
  'attributes',
] as const;
