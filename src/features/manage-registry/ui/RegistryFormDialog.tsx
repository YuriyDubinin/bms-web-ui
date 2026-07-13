import { useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@shared/api';
import { Button, Checkbox, Dialog, Input, Select, notify } from '@shared/ui';
import {
  useCreateRegistry,
  useUpdateRegistry,
  type CreateRegistryInput,
  type Registry,
  type UpdateRegistryInput,
} from '@entities/registry';
import {
  REGISTRY_FORM_FIELDS,
  REGISTRY_TYPE_OPTIONS,
  REGISTRY_URL_PRESETS,
  registryFormSchema,
  type RegistryFormValues,
} from '../model/schema';

export type RegistryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задан — режим редактирования; иначе — создание. */
  registry?: Registry | null;
};

const FORM_ID = 'registry-form';

function emptyValues(): RegistryFormValues {
  return {
    name: '',
    type: 'DOCKERHUB',
    url: REGISTRY_URL_PRESETS.DOCKERHUB,
    username: '',
    password: '',
    email: '',
    namespace: '',
    is_default: false,
    is_active: true,
    insecure: false,
    clear_credentials: false,
  };
}

function valuesFromRegistry(r: Registry): RegistryFormValues {
  return {
    name: r.name,
    type: r.type,
    url: r.url,
    username: r.username ?? '',
    password: '',
    email: r.email ?? '',
    namespace: r.namespace ?? '',
    is_default: r.is_default,
    is_active: r.is_active,
    insecure: r.insecure,
    clear_credentials: false,
  };
}

export function RegistryFormDialog({ open, onOpenChange, registry }: RegistryFormDialogProps) {
  const isEdit = !!registry;
  const createMut = useCreateRegistry();
  const updateMut = useUpdateRegistry();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistryFormValues>({
    resolver: zodResolver(registryFormSchema),
    defaultValues: emptyValues(),
  });

  // Сброс значений при открытии/смене записи.
  useEffect(() => {
    if (open) reset(registry ? valuesFromRegistry(registry) : emptyValues());
  }, [open, registry, reset]);

  const clearCreds = watch('clear_credentials');

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((REGISTRY_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof REGISTRY_FORM_FIELDS)[number], {
              type: 'server',
              message: d.message,
            });
          }
        }
        return;
      }
      // REGISTRY_EXISTS — доменный код, не входит в общий ApiErrorCode union.
      if ((err.code as string) === 'REGISTRY_EXISTS') {
        setError('name', { type: 'server', message: 'Name already taken' });
        return;
      }
      notify.error(err.message || 'Request failed', { code: err.code });
      return;
    }
    notify.error('Something went wrong');
  };

  const onSubmit = handleSubmit(async (values) => {
    // При создании password обязателен (в edit пустой = «не менять»).
    if (!isEdit && !values.password) {
      setError('password', { type: 'manual', message: 'Required' });
      return;
    }

    const base = {
      name: values.name.trim(),
      type: values.type,
      url: values.url.trim(),
      username: values.username.trim() || undefined,
      email: values.email.trim(), // обязателен (логин в аккаунт реестра)
      namespace: values.namespace.trim() || undefined,
      is_default: values.is_default,
      insecure: values.insecure,
    };

    try {
      if (isEdit && registry) {
        // password: непустой → заменить; пустой + clear → ""; иначе не слать.
        let password: string | undefined;
        if (values.password) password = values.password;
        else if (values.clear_credentials) password = '';
        const input: UpdateRegistryInput = {
          ...base,
          id: registry.id,
          is_active: values.is_active,
          ...(password !== undefined ? { password } : {}),
        };
        await updateMut.mutateAsync(input);
        notify.success('Registry updated', { description: values.name });
      } else {
        const input: CreateRegistryInput = {
          ...base,
          ...(values.password ? { password: values.password } : {}),
        };
        await createMut.mutateAsync(input);
        notify.success('Registry created', { description: values.name });
      }
      onOpenChange(false);
    } catch (err) {
      applyServerError(err);
    }
  });

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as RegistryFormValues['type'];
    const preset = REGISTRY_URL_PRESETS[next];
    const currentUrl = getValues('url').trim();
    const isPreset = (Object.values(REGISTRY_URL_PRESETS) as string[]).includes(currentUrl);
    // Подставляем preset, если поле пустое или содержит другой preset (не трогаем ручной ввод).
    if (preset && (!currentUrl || isPreset)) {
      setValue('url', preset, { shouldValidate: false });
    }
  };

  const typeReg = register('type');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
      title={isEdit ? 'Edit registry' : 'Add registry'}
      description={isEdit ? registry?.name : 'Connect a Docker registry'}
      className="w-[min(92vw,560px)]"
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
            placeholder="DockerHub prod"
            error={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <Select
            label="Type"
            required
            options={REGISTRY_TYPE_OPTIONS}
            error={errors.type?.message}
            disabled={isSubmitting}
            {...typeReg}
            onChange={(e) => {
              typeReg.onChange(e);
              handleTypeChange(e);
            }}
          />
        </div>

        <Input
          label="URL"
          required
          placeholder="https://registry-1.docker.io"
          error={errors.url?.message}
          disabled={isSubmitting}
          {...register('url')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Username"
            placeholder="anonymous if empty"
            error={errors.username?.message}
            disabled={isSubmitting}
            autoComplete="off"
            {...register('username')}
          />
          <Input
            label="Password / token"
            type="password"
            showToggle
            required={!isEdit}
            defaultRevealed={isEdit}
            placeholder={isEdit ? 'leave empty to keep' : 'account password / token'}
            helper={isEdit && registry?.has_credentials ? 'Credentials are stored' : undefined}
            error={errors.password?.message}
            disabled={isSubmitting || (isEdit && clearCreds)}
            autoComplete="new-password"
            {...register('password')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            required
            placeholder="login@example.com"
            helper="Used as the account login for the registry."
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />
          <Input
            label="Namespace"
            placeholder="default org / project"
            error={errors.namespace?.message}
            disabled={isSubmitting}
            {...register('namespace')}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
          <Checkbox
            label="Default registry"
            hint="Used as the primary registry (only one per system)."
            disabled={isSubmitting}
            {...register('is_default')}
          />
          {isEdit ? (
            <Checkbox
              label="Active"
              hint="Disabled registries stay in the list but are not used."
              disabled={isSubmitting}
              {...register('is_active')}
            />
          ) : null}
          <Checkbox
            label="Insecure"
            hint="Allow http / self-signed TLS."
            disabled={isSubmitting}
            {...register('insecure')}
          />
          {isEdit && registry?.has_credentials ? (
            <Checkbox
              label="Clear stored credentials"
              hint="Remove the saved username/password on save."
              disabled={isSubmitting}
              {...register('clear_credentials')}
            />
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
