import { z } from 'zod';
import { ROLES } from '@shared/api';
import { ROLE_LABELS } from '@entities/user';

export const userFormSchema = z.object({
  email: z.string().trim().min(1, 'Required').max(255, 'Too long').email('Invalid email'),
  full_name: z.string().trim().min(2, 'Must be 2–255 characters').max(255, 'Too long'),
  role: z.enum(ROLES),
  password: z.string(),
  is_active: z.boolean(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export const USER_FORM_FIELDS = ['email', 'full_name', 'role', 'password'] as const;
