import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(255, 'Too long')
    .email('Invalid email'),
  password: z.string().min(1, 'Required').max(72, 'Too long'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  company_name: z.string().trim().min(2, 'Must be 2–255 characters').max(255, 'Too long'),
  full_name: z.string().trim().min(2, 'Must be 2–255 characters').max(255, 'Too long'),
  email: z.string().trim().min(1, 'Required').max(255, 'Too long').email('Invalid email'),
  password: z.string().min(8, 'Must be 8–72 characters').max(72, 'Too long'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
