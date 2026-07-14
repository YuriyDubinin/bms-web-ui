import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, isExistsError } from '@shared/api';
import { Button, Dialog, Input, Select, Textarea, notify } from '@shared/ui';
import { parseJsonObject, stringifyJsonObject } from '@shared/lib';
import {
  PROJECT_STATUS_OPTIONS,
  useCreateProject,
  useUpdateProject,
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from '@entities/project';
import { PROJECT_FORM_FIELDS, projectFormSchema, type ProjectFormValues } from '../model/schema';

export type ProjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задан — режим редактирования; иначе — создание. */
  project?: Project | null;
};

const FORM_ID = 'project-form';

function emptyValues(): ProjectFormValues {
  return {
    name: '',
    slug: '',
    direction: '',
    description: '',
    status: 'ACTIVE',
    attributes: '',
    starts_at: '',
    ends_at: '',
  };
}

function valuesFromProject(p: Project): ProjectFormValues {
  return {
    name: p.name,
    slug: p.slug ?? '',
    direction: p.direction ?? '',
    description: p.description ?? '',
    status: p.status,
    attributes: stringifyJsonObject(p.attributes),
    starts_at: p.starts_at ?? '',
    ends_at: p.ends_at ?? '',
  };
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const isEdit = !!project;
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (open) reset(project ? valuesFromProject(project) : emptyValues());
  }, [open, project, reset]);

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((PROJECT_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof PROJECT_FORM_FIELDS)[number], {
              type: 'server',
              message: d.message,
            });
          }
        }
        return;
      }
      if (isExistsError(err.code)) {
        setError('slug', { type: 'server', message: 'Slug already taken' });
        return;
      }
      notify.error(err.message || 'Request failed', { code: err.code });
      return;
    }
    notify.error('Something went wrong');
  };

  const onSubmit = handleSubmit(async (values) => {
    const base = {
      name: values.name.trim(),
      slug: values.slug.trim() || undefined,
      direction: values.direction.trim() || undefined,
      description: values.description.trim() || undefined,
      status: values.status,
      attributes: parseJsonObject(values.attributes),
      starts_at: values.starts_at || undefined,
      ends_at: values.ends_at || undefined,
    };

    try {
      if (isEdit && project) {
        const input: UpdateProjectInput = { ...base, id: project.id };
        await updateMut.mutateAsync(input);
        notify.success('Project updated', { description: values.name });
      } else {
        const input: CreateProjectInput = base;
        await createMut.mutateAsync(input);
        notify.success('Project created', { description: values.name });
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
      title={isEdit ? 'Edit project' : 'New project'}
      description={isEdit ? project?.name : 'Create a project'}
      className="w-[min(94vw,640px)]"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            error={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <Input
            label="Slug"
            placeholder="auto if empty"
            error={errors.slug?.message}
            disabled={isSubmitting}
            {...register('slug')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Direction"
            placeholder="e.g. автопарк"
            error={errors.direction?.message}
            disabled={isSubmitting}
            {...register('direction')}
          />
          <Select
            label="Status"
            options={PROJECT_STATUS_OPTIONS}
            error={errors.status?.message}
            disabled={isSubmitting}
            {...register('status')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts at"
            type="date"
            error={errors.starts_at?.message}
            disabled={isSubmitting}
            {...register('starts_at')}
          />
          <Input
            label="Ends at"
            type="date"
            error={errors.ends_at?.message}
            disabled={isSubmitting}
            {...register('ends_at')}
          />
        </div>

        <Textarea
          label="Description"
          rows={3}
          error={errors.description?.message}
          disabled={isSubmitting}
          {...register('description')}
        />

        <Textarea
          label="Attributes (JSON)"
          rows={4}
          placeholder="{}"
          className="font-mono text-xs"
          error={errors.attributes?.message}
          disabled={isSubmitting}
          {...register('attributes')}
        />
      </form>
    </Dialog>
  );
}
