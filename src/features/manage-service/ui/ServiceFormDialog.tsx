import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@shared/api';
import { Button, Dialog, Input, Select, Textarea, notify } from '@shared/ui';
import { parseJsonObject, stringifyJsonObject } from '@shared/lib';
import { useAllProjectsQuery } from '@entities/project';
import {
  SERVICE_STATUS_OPTIONS,
  useCreateService,
  useUpdateService,
  type CreateServiceInput,
  type Service,
  type UpdateServiceInput,
} from '@entities/service';
import { SERVICE_FORM_FIELDS, serviceFormSchema, type ServiceFormValues } from '../model/schema';

export type ServiceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  /** Если открыт из контекста проекта — предзаполняет и блокирует привязку. */
  defaultProjectId?: string;
};

const FORM_ID = 'service-form';

function emptyValues(defaultProjectId?: string): ServiceFormValues {
  return {
    project_id: defaultProjectId ?? '',
    name: '',
    category: '',
    description: '',
    price: '',
    currency: 'USD',
    duration_min: '',
    status: 'ACTIVE',
    attributes: '',
  };
}

function valuesFromService(s: Service): ServiceFormValues {
  return {
    project_id: s.project_id ?? '',
    name: s.name,
    category: s.category ?? '',
    description: s.description ?? '',
    price: s.price != null ? String(s.price) : '',
    currency: s.currency,
    duration_min: s.duration_min != null ? String(s.duration_min) : '',
    status: s.status,
    attributes: stringifyJsonObject(s.attributes),
  };
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  defaultProjectId,
}: ServiceFormDialogProps) {
  const isEdit = !!service;
  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const { data: projectsData } = useAllProjectsQuery();
  const projectOptions = [
    { value: '', label: 'No project' },
    ...(projectsData?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: emptyValues(defaultProjectId),
  });

  useEffect(() => {
    if (open) reset(service ? valuesFromService(service) : emptyValues(defaultProjectId));
  }, [open, service, defaultProjectId, reset]);

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((SERVICE_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof SERVICE_FORM_FIELDS)[number], {
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
    const base = {
      project_id: values.project_id || undefined,
      name: values.name.trim(),
      category: values.category.trim() || undefined,
      description: values.description.trim() || undefined,
      price: values.price.trim() ? Number(values.price) : undefined,
      currency: values.currency.trim() || undefined,
      duration_min: values.duration_min.trim() ? Number(values.duration_min) : undefined,
      status: values.status,
      attributes: parseJsonObject(values.attributes),
    };

    try {
      if (isEdit && service) {
        const input: UpdateServiceInput = { ...base, id: service.id };
        await updateMut.mutateAsync(input);
        notify.success('Service updated', { description: values.name });
      } else {
        const input: CreateServiceInput = base;
        await createMut.mutateAsync(input);
        notify.success('Service created', { description: values.name });
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
      title={isEdit ? 'Edit service' : 'New service'}
      description={isEdit ? service?.name : 'Add a service to the catalog'}
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
          <Select
            label="Project"
            placeholder="No project"
            options={projectOptions.filter((o) => o.value !== '')}
            error={errors.project_id?.message}
            disabled={isSubmitting || !!defaultProjectId}
            {...register('project_id')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Category"
            error={errors.category?.message}
            disabled={isSubmitting}
            {...register('category')}
          />
          <Select
            label="Status"
            options={SERVICE_STATUS_OPTIONS}
            error={errors.status?.message}
            disabled={isSubmitting}
            {...register('status')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Price"
            inputMode="decimal"
            placeholder="0.00"
            error={errors.price?.message}
            disabled={isSubmitting}
            {...register('price')}
          />
          <Input
            label="Currency"
            placeholder="USD"
            error={errors.currency?.message}
            disabled={isSubmitting}
            {...register('currency')}
          />
          <Input
            label="Duration (min)"
            inputMode="numeric"
            placeholder="60"
            error={errors.duration_min?.message}
            disabled={isSubmitting}
            {...register('duration_min')}
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
          rows={3}
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
