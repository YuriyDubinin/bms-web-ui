import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '@entities/task';

export const taskFormSchema = z.object({
  project_id: z.string(),
  title: z.string().trim().min(2, 'Must be 2–500 characters').max(500, 'Too long'),
  description: z.string().trim().max(10000, 'Too long'),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigned_to: z.string(),
  due_at: z.string(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const TASK_FORM_FIELDS = [
  'project_id',
  'title',
  'description',
  'status',
  'priority',
  'assigned_to',
  'due_at',
] as const;
