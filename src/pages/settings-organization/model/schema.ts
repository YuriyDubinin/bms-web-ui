import { z } from 'zod';
import { isValidJsonObject } from '@shared/lib';

export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(255, 'Too long'),
  legal_name: z.string().trim().max(255, 'Too long'),
  industry: z.string().trim().max(255, 'Too long'),
  email: z.string().trim().min(1, 'Required').max(255, 'Too long').email('Invalid email'),
  phone: z.string().trim().max(50, 'Too long'),
  timezone: z.string().trim().max(100, 'Too long'),
  locale: z.string().trim().max(10, 'Too long'),
  settings: z.string().refine(isValidJsonObject, 'Must be a valid JSON object'),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const ORGANIZATION_FORM_FIELDS = [
  'name',
  'legal_name',
  'industry',
  'email',
  'phone',
  'timezone',
  'locale',
  'settings',
] as const;
