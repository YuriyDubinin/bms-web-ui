import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@shared/api';
import { Button, Dialog, Input, Select, Textarea, notify } from '@shared/ui';
import { fromDateTimeLocalInput, toDateTimeLocalInput } from '@shared/lib';
import { useAllProjectsQuery } from '@entities/project';
import { useAllUsersQuery } from '@entities/user';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  useCreateTask,
  useUpdateTask,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@entities/task';
import { TASK_FORM_FIELDS, taskFormSchema, type TaskFormValues } from '../model/schema';

export type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
};

const FORM_ID = 'task-form';

function emptyValues(defaultProjectId?: string): TaskFormValues {
  return {
    project_id: defaultProjectId ?? '',
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assigned_to: '',
    due_at: '',
  };
}

function valuesFromTask(t: Task): TaskFormValues {
  return {
    project_id: t.project_id ?? '',
    title: t.title,
    description: t.description ?? '',
    status: t.status,
    priority: t.priority,
    assigned_to: t.assigned_to ?? '',
    due_at: toDateTimeLocalInput(t.due_at),
  };
}

export function TaskFormDialog({ open, onOpenChange, task, defaultProjectId }: TaskFormDialogProps) {
  const isEdit = !!task;
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const { data: projectsData } = useAllProjectsQuery();
  const { data: usersData } = useAllUsersQuery();
  const projectOptions = (projectsData?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const userOptions = (usersData?.items ?? []).map((u) => ({ value: u.id, label: u.full_name }));

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyValues(defaultProjectId),
  });

  useEffect(() => {
    if (open) reset(task ? valuesFromTask(task) : emptyValues(defaultProjectId));
  }, [open, task, defaultProjectId, reset]);

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((TASK_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof TASK_FORM_FIELDS)[number], { type: 'server', message: d.message });
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
    const base = {
      project_id: values.project_id || undefined,
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      status: values.status,
      priority: values.priority,
      assigned_to: values.assigned_to || undefined,
      due_at: fromDateTimeLocalInput(values.due_at),
    };

    try {
      if (isEdit && task) {
        const input: UpdateTaskInput = { ...base, id: task.id };
        await updateMut.mutateAsync(input);
        notify.success('Task updated', { description: values.title });
      } else {
        const input: CreateTaskInput = base;
        await createMut.mutateAsync(input);
        notify.success('Task created', { description: values.title });
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
      title={isEdit ? 'Edit task' : 'New task'}
      className="w-[min(94vw,560px)]"
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
          <Select
            label="Project"
            placeholder="No project"
            options={projectOptions}
            error={errors.project_id?.message}
            disabled={isSubmitting || !!defaultProjectId}
            {...register('project_id')}
          />
          <Select
            label="Assigned to"
            placeholder="Unassigned"
            options={userOptions}
            error={errors.assigned_to?.message}
            disabled={isSubmitting}
            {...register('assigned_to')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Status"
            options={TASK_STATUS_OPTIONS}
            error={errors.status?.message}
            disabled={isSubmitting}
            {...register('status')}
          />
          <Select
            label="Priority"
            options={TASK_PRIORITY_OPTIONS}
            error={errors.priority?.message}
            disabled={isSubmitting}
            {...register('priority')}
          />
          <Input
            label="Due at"
            type="datetime-local"
            error={errors.due_at?.message}
            disabled={isSubmitting}
            {...register('due_at')}
          />
        </div>

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
