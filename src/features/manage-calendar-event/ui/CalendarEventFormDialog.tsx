import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@shared/api';
import { Button, Checkbox, Dialog, Input, Select, Textarea, notify } from '@shared/ui';
import { fromDateTimeLocalInput, toDateTimeLocalInput } from '@shared/lib';
import { useAllProjectsQuery } from '@entities/project';
import {
  CALENDAR_EVENT_STATUS_OPTIONS,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  type CalendarEvent,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from '@entities/calendar-event';
import {
  CALENDAR_EVENT_FORM_FIELDS,
  calendarEventFormSchema,
  type CalendarEventFormValues,
} from '../model/schema';

export type CalendarEventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultProjectId?: string;
};

const FORM_ID = 'calendar-event-form';

function emptyValues(defaultProjectId?: string): CalendarEventFormValues {
  return {
    project_id: defaultProjectId ?? '',
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    all_day: false,
    status: 'SCHEDULED',
    recurrence_rule: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

function valuesFromEvent(e: CalendarEvent): CalendarEventFormValues {
  return {
    project_id: e.project_id ?? '',
    title: e.title,
    description: e.description ?? '',
    location: e.location ?? '',
    starts_at: toDateTimeLocalInput(e.starts_at),
    ends_at: toDateTimeLocalInput(e.ends_at),
    all_day: e.all_day,
    status: e.status,
    recurrence_rule: e.recurrence_rule ?? '',
    timezone: e.timezone,
  };
}

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  event,
  defaultProjectId,
}: CalendarEventFormDialogProps) {
  const isEdit = !!event;
  const createMut = useCreateCalendarEvent();
  const updateMut = useUpdateCalendarEvent();
  const { data: projectsData } = useAllProjectsQuery();
  const projectOptions = (projectsData?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: emptyValues(defaultProjectId),
  });

  useEffect(() => {
    if (open) reset(event ? valuesFromEvent(event) : emptyValues(defaultProjectId));
  }, [open, event, defaultProjectId, reset]);

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((CALENDAR_EVENT_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof CALENDAR_EVENT_FORM_FIELDS)[number], {
              type: 'server',
              message: d.message,
            });
          }
        }
        return;
      }
      notify.error(err.message || 'Request failed', { code: err.code });
      return;
    }
    notify.error('Something went wrong');
  };

  const onSubmit = handleSubmit(async (values) => {
    const startsAt = fromDateTimeLocalInput(values.starts_at);
    const endsAt = fromDateTimeLocalInput(values.ends_at);
    if (!startsAt || !endsAt) {
      notify.error('Invalid date/time');
      return;
    }

    const base = {
      project_id: values.project_id || undefined,
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      location: values.location.trim() || undefined,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: values.all_day,
      status: values.status,
      recurrence_rule: values.recurrence_rule.trim() || undefined,
      timezone: values.timezone.trim() || undefined,
    };

    try {
      if (isEdit && event) {
        const input: UpdateCalendarEventInput = { ...base, id: event.id };
        await updateMut.mutateAsync(input);
        notify.success('Event updated', { description: values.title });
      } else {
        const input: CreateCalendarEventInput = base;
        await createMut.mutateAsync(input);
        notify.success('Event created', { description: values.title });
      }
      onOpenChange(false);
    } catch (err) {
      applyServerError(err);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
      title={isEdit ? 'Edit event' : 'New event'}
      className="w-[min(94vw,600px)]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Title"
          required
          error={errors.title?.message}
          disabled={isSubmitting}
          {...register('title')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts at"
            type="datetime-local"
            required
            error={errors.starts_at?.message}
            disabled={isSubmitting}
            {...register('starts_at')}
          />
          <Input
            label="Ends at"
            type="datetime-local"
            required
            error={errors.ends_at?.message}
            disabled={isSubmitting}
            {...register('ends_at')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Project"
            placeholder="No project"
            options={projectOptions}
            error={errors.project_id?.message}
            disabled={isSubmitting || !!defaultProjectId}
            {...register('project_id')}
          />
          <Select
            label="Status"
            options={CALENDAR_EVENT_STATUS_OPTIONS}
            error={errors.status?.message}
            disabled={isSubmitting}
            {...register('status')}
          />
        </div>

        <Input
          label="Location"
          error={errors.location?.message}
          disabled={isSubmitting}
          {...register('location')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Recurrence rule"
            placeholder="RRULE:FREQ=WEEKLY;..."
            className="font-mono text-xs"
            error={errors.recurrence_rule?.message}
            disabled={isSubmitting}
            {...register('recurrence_rule')}
          />
          <Input
            label="Timezone"
            error={errors.timezone?.message}
            disabled={isSubmitting}
            {...register('timezone')}
          />
        </div>

        <Checkbox label="All day" disabled={isSubmitting} {...register('all_day')} />

        <Textarea
          label="Description"
          rows={3}
          error={errors.description?.message}
          disabled={isSubmitting}
          {...register('description')}
        />
      </form>
    </Dialog>
  );
}
