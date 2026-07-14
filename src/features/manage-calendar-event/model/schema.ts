import { z } from 'zod';
import { CALENDAR_EVENT_STATUSES } from '@entities/calendar-event';

export const calendarEventFormSchema = z
  .object({
    project_id: z.string(),
    title: z.string().trim().min(2, 'Must be 2–255 characters').max(255, 'Too long'),
    description: z.string().trim().max(10000, 'Too long'),
    location: z.string().trim().max(500, 'Too long'),
    starts_at: z.string().min(1, 'Required'),
    ends_at: z.string().min(1, 'Required'),
    all_day: z.boolean(),
    status: z.enum(CALENDAR_EVENT_STATUSES),
    recurrence_rule: z.string().trim().max(1000, 'Too long'),
    timezone: z.string().trim().max(100, 'Too long'),
  })
  .refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), {
    message: 'Must be after start time',
    path: ['ends_at'],
  });

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

export const CALENDAR_EVENT_FORM_FIELDS = [
  'project_id',
  'title',
  'description',
  'location',
  'starts_at',
  'ends_at',
  'all_day',
  'status',
  'recurrence_rule',
  'timezone',
] as const;
