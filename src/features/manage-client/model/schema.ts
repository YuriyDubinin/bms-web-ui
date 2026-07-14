import { z } from 'zod';
import { isValidJsonObject } from '@shared/lib';
import { CLIENT_STATUSES } from '@entities/client';

export const clientFormSchema = z
  .object({
    project_id: z.string(),
    first_name: z.string().trim().max(255, 'Too long'),
    last_name: z.string().trim().max(255, 'Too long'),
    company_name: z.string().trim().max(255, 'Too long'),
    email: z.string().trim().max(255, 'Too long').refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email'),
    phone: z.string().trim().max(50, 'Too long'),
    status: z.enum(CLIENT_STATUSES),
    source: z.string().trim().max(255, 'Too long'),
    address: z.string().refine(isValidJsonObject, 'Must be a valid JSON object'),
    attributes: z.string().refine(isValidJsonObject, 'Must be a valid JSON object'),
  })
  .refine((v) => !!(v.first_name || v.last_name || v.company_name), {
    message: 'Provide a first/last name or a company name',
    path: ['first_name'],
  });

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const CLIENT_FORM_FIELDS = [
  'project_id',
  'first_name',
  'last_name',
  'company_name',
  'email',
  'phone',
  'status',
  'source',
  'address',
  'attributes',
] as const;
