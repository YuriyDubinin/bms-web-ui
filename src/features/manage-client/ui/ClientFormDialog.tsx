import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@shared/api';
import { Button, Dialog, Input, Select, Textarea, notify } from '@shared/ui';
import { parseJsonObject, stringifyJsonObject } from '@shared/lib';
import { useAllProjectsQuery } from '@entities/project';
import {
  CLIENT_STATUS_OPTIONS,
  useCreateClient,
  useUpdateClient,
  type Client,
  type CreateClientInput,
  type UpdateClientInput,
} from '@entities/client';
import { CLIENT_FORM_FIELDS, clientFormSchema, type ClientFormValues } from '../model/schema';

export type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  defaultProjectId?: string;
};

const FORM_ID = 'client-form';

function emptyValues(defaultProjectId?: string): ClientFormValues {
  return {
    project_id: defaultProjectId ?? '',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    status: 'LEAD',
    source: '',
    address: '',
    attributes: '',
  };
}

function valuesFromClient(c: Client): ClientFormValues {
  return {
    project_id: c.project_id ?? '',
    first_name: c.first_name ?? '',
    last_name: c.last_name ?? '',
    company_name: c.company_name ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    status: c.status,
    source: c.source ?? '',
    address: stringifyJsonObject(c.address),
    attributes: stringifyJsonObject(c.attributes),
  };
}

export function ClientFormDialog({ open, onOpenChange, client, defaultProjectId }: ClientFormDialogProps) {
  const isEdit = !!client;
  const createMut = useCreateClient();
  const updateMut = useUpdateClient();
  const { data: projectsData } = useAllProjectsQuery();
  const projectOptions = (projectsData?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyValues(defaultProjectId),
  });

  useEffect(() => {
    if (open) reset(client ? valuesFromClient(client) : emptyValues(defaultProjectId));
  }, [open, client, defaultProjectId, reset]);

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((CLIENT_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof CLIENT_FORM_FIELDS)[number], {
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
      first_name: values.first_name.trim() || undefined,
      last_name: values.last_name.trim() || undefined,
      company_name: values.company_name.trim() || undefined,
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
      status: values.status,
      source: values.source.trim() || undefined,
      address: parseJsonObject(values.address),
      attributes: parseJsonObject(values.attributes),
    };

    try {
      if (isEdit && client) {
        const input: UpdateClientInput = { ...base, id: client.id };
        await updateMut.mutateAsync(input);
        notify.success('Client updated');
      } else {
        const input: CreateClientInput = base;
        await createMut.mutateAsync(input);
        notify.success('Client created');
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
      title={isEdit ? 'Edit client' : 'New client'}
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
            label="First name"
            error={errors.first_name?.message}
            disabled={isSubmitting}
            {...register('first_name')}
          />
          <Input
            label="Last name"
            error={errors.last_name?.message}
            disabled={isSubmitting}
            {...register('last_name')}
          />
        </div>

        <Input
          label="Company name"
          helper="Provide a name, or a company (at least one)"
          error={errors.company_name?.message}
          disabled={isSubmitting}
          {...register('company_name')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />
          <Input
            label="Phone"
            error={errors.phone?.message}
            disabled={isSubmitting}
            {...register('phone')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
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
            options={CLIENT_STATUS_OPTIONS}
            error={errors.status?.message}
            disabled={isSubmitting}
            {...register('status')}
          />
          <Input
            label="Source"
            placeholder="referral, website…"
            error={errors.source?.message}
            disabled={isSubmitting}
            {...register('source')}
          />
        </div>

        <Textarea
          label="Address (JSON)"
          rows={3}
          placeholder="{}"
          className="font-mono text-xs"
          error={errors.address?.message}
          disabled={isSubmitting}
          {...register('address')}
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
