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
