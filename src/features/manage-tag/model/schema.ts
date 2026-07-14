import { z } from 'zod';

export const tagFormSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(100, 'Too long'),
  color: z.string().trim().max(32, 'Too long'),
});

export type TagFormValues = z.infer<typeof tagFormSchema>;
