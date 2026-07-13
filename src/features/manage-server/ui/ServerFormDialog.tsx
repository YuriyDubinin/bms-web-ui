import { useEffect, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { ApiError } from '@shared/api';
import { Button, Checkbox, Dialog, Input, Label, Select, Textarea, notify } from '@shared/ui';
import {
  useCreateServer,
  useUpdateServer,
  type CreateServerInput,
  type Server,
  type UpdateServerInput,
} from '@entities/server';
import {
  SERVER_AUTH_METHOD_OPTIONS,
  SERVER_ENVIRONMENT_OPTIONS,
  SERVER_FORM_FIELDS,
  SERVER_PROTOCOL_OPTIONS,
  serverFormSchema,
  type ServerFormValues,
} from '../model/schema';

export type ServerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задан — режим редактирования; иначе — создание. */
  server?: Server | null;
};

const FORM_ID = 'server-form';

function emptyValues(): ServerFormValues {
  return {
    name: '',
    host: '',
    port: '22',
    protocol: 'SSH',
    username: '',
    auth_method: 'PASSWORD',
    password: '',
    private_key: '',
    private_key_passphrase: '',
    description: '',
    environment: 'PRODUCTION',
    provider: '',
    location: '',
    tags: [],
    is_active: true,
    clear_password: false,
    clear_private_key: false,
  };
}

function valuesFromServer(s: Server): ServerFormValues {
  return {
    name: s.name,
    host: s.host,
    port: String(s.port ?? 22),
    protocol: s.protocol,
    username: s.username ?? '',
    auth_method: s.auth_method,
    password: '',
    private_key: '',
    private_key_passphrase: '',
    description: s.description ?? '',
    environment: s.environment,
    provider: s.provider ?? '',
    location: s.location ?? '',
    tags: s.tags ?? [],
    is_active: s.is_active,
    clear_password: false,
    clear_private_key: false,
  };
}

export function ServerFormDialog({ open, onOpenChange, server }: ServerFormDialogProps) {
  const isEdit = !!server;
  const createMut = useCreateServer();
  const updateMut = useUpdateServer();
  const [tagDraft, setTagDraft] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: emptyValues(),
  });

  // Сброс значений при открытии/смене записи.
  useEffect(() => {
    if (open) {
      reset(server ? valuesFromServer(server) : emptyValues());
      setTagDraft('');
    }
  }, [open, server, reset]);

  const authMethod = watch('auth_method');
  const clearPassword = watch('clear_password');
  const clearPrivateKey = watch('clear_private_key');
  const tags = watch('tags');

  const needsPassword = authMethod === 'PASSWORD';
  const needsPrivateKey = authMethod === 'PRIVATE_KEY';

  // ---- Теги (мультиввод) ----
  const addTag = (raw: string) => {
    const value = raw.trim().slice(0, 50);
    if (!value) return;
    const current = getValues('tags');
    if (current.includes(value) || current.length >= 30) return;
    setValue('tags', [...current, value], { shouldDirty: true });
  };
  const removeTag = (value: string) => {
    setValue(
      'tags',
      getValues('tags').filter((t) => t !== value),
      { shouldDirty: true },
    );
  };
  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagDraft);
      setTagDraft('');
    } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
      removeTag(tags[tags.length - 1] as string);
    }
  };

  const applyServerError = (err: unknown): void => {
    if (err instanceof ApiError) {
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        for (const d of err.details) {
          if ((SERVER_FORM_FIELDS as readonly string[]).includes(d.field)) {
            setError(d.field as (typeof SERVER_FORM_FIELDS)[number], {
              type: 'server',
              message: d.message,
            });
          }
        }
        return;
      }
      // SERVER_EXISTS — доменный код, не входит в общий ApiErrorCode union.
      if ((err.code as string) === 'SERVER_EXISTS') {
        setError('name', { type: 'server', message: 'Name already taken' });
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
      host: values.host.trim(),
      port: values.port.trim() ? Number(values.port) : 22,
      protocol: values.protocol,
      username: values.username.trim() || undefined,
      auth_method: values.auth_method,
      description: values.description.trim() || undefined,
      environment: values.environment,
      provider: values.provider.trim() || undefined,
      location: values.location.trim() || undefined,
      tags: values.tags,
    };

    // Секреты: пустой + clear → ""; непустой → заменить; иначе не слать.
    // Для create поле clear_* всегда false, поэтому пустой секрет просто не отправляется.
    const secretField = (value: string, clear: boolean): string | undefined => {
      if (value) return value;
      if (isEdit && clear) return '';
      return undefined;
    };

    const password = needsPassword ? secretField(values.password, values.clear_password) : undefined;
    const privateKey = needsPrivateKey
      ? secretField(values.private_key, values.clear_private_key)
      : undefined;
    const passphrase = needsPrivateKey
      ? secretField(values.private_key_passphrase, values.clear_private_key)
      : undefined;

    try {
      if (isEdit && server) {
        const input: UpdateServerInput = {
          ...base,
          id: server.id,
          is_active: values.is_active,
          ...(password !== undefined ? { password } : {}),
          ...(privateKey !== undefined ? { private_key: privateKey } : {}),
          ...(passphrase !== undefined ? { private_key_passphrase: passphrase } : {}),
        };
        await updateMut.mutateAsync(input);
        notify.success('Server updated', { description: values.name });
      } else {
        const input: CreateServerInput = {
          ...base,
          ...(password ? { password } : {}),
          ...(privateKey ? { private_key: privateKey } : {}),
          ...(passphrase ? { private_key_passphrase: passphrase } : {}),
        };
        await createMut.mutateAsync(input);
        notify.success('Server created', { description: values.name });
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
      title={isEdit ? 'Edit server' : 'Add server'}
      description={isEdit ? server?.name : 'Connect a remote server'}
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
            placeholder="web-prod-1"
            error={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <Select
            label="Environment"
            required
            options={SERVER_ENVIRONMENT_OPTIONS}
            error={errors.environment?.message}
            disabled={isSubmitting}
            {...register('environment')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_140px_160px]">
          <Input
            label="Host"
            required
            placeholder="37.1.215.81 or host.example.com"
            error={errors.host?.message}
            disabled={isSubmitting}
            {...register('host')}
          />
          <Input
            label="Port"
            inputMode="numeric"
            placeholder="22"
            error={errors.port?.message}
            disabled={isSubmitting}
            {...register('port')}
          />
          <Select
            label="Protocol"
            options={SERVER_PROTOCOL_OPTIONS}
            error={errors.protocol?.message}
            disabled={isSubmitting}
            {...register('protocol')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Username"
            placeholder="root"
            error={errors.username?.message}
            disabled={isSubmitting}
            autoComplete="off"
            {...register('username')}
          />
          <Select
            label="Auth method"
            options={SERVER_AUTH_METHOD_OPTIONS}
            error={errors.auth_method?.message}
            disabled={isSubmitting}
            {...register('auth_method')}
          />
        </div>

        {/* Секреты — зависят от метода аутентификации. */}
        {needsPassword ? (
          <Input
            label="Password"
            type="password"
            showToggle
            defaultRevealed={isEdit}
            placeholder={isEdit ? 'leave empty to keep' : 'account password'}
            helper={isEdit && server?.has_password ? 'Secret is stored' : undefined}
            error={errors.password?.message}
            disabled={isSubmitting || (isEdit && clearPassword)}
            autoComplete="new-password"
            {...register('password')}
          />
        ) : null}

        {needsPrivateKey ? (
          <div className="flex flex-col gap-4">
            <Textarea
              label="Private key"
              rows={5}
              placeholder={
                isEdit ? 'leave empty to keep' : '-----BEGIN OPENSSH PRIVATE KEY-----'
              }
              helper={isEdit && server?.has_private_key ? 'Secret is stored' : undefined}
              error={errors.private_key?.message}
              disabled={isSubmitting || (isEdit && clearPrivateKey)}
              className="font-mono text-xs"
              {...register('private_key')}
            />
            <Input
              label="Key passphrase"
              type="password"
              showToggle
              defaultRevealed={isEdit}
              placeholder={isEdit ? 'leave empty to keep' : 'optional'}
              error={errors.private_key_passphrase?.message}
              disabled={isSubmitting || (isEdit && clearPrivateKey)}
              autoComplete="new-password"
              {...register('private_key_passphrase')}
            />
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Provider"
            placeholder="AWS / Hetzner / self-hosted"
            error={errors.provider?.message}
            disabled={isSubmitting}
            {...register('provider')}
          />
          <Input
            label="Location"
            placeholder="region / datacenter"
            error={errors.location?.message}
            disabled={isSubmitting}
            {...register('location')}
          />
        </div>

        {/* Теги — мультиввод (Enter / запятая для добавления). */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="server-tags-input">Tags</Label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border-subtle bg-bg-1 px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-sm bg-accent-muted px-1.5 py-0.5 font-mono text-xs text-accent"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => removeTag(tag)}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-sm text-accent/70 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <X size={11} aria-hidden />
                </button>
              </span>
            ))}
            <input
              id="server-tags-input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={() => {
                if (tagDraft.trim()) {
                  addTag(tagDraft);
                  setTagDraft('');
                }
              }}
              disabled={isSubmitting || tags.length >= 30}
              placeholder={tags.length ? '' : 'prod, web…'}
              className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          {errors.tags?.message ? (
            <p role="alert" aria-live="polite" className="text-xs text-state-error">
              {errors.tags.message}
            </p>
          ) : (
            <p className="text-xs text-fg-muted">Press Enter or comma to add. Up to 30 tags.</p>
          )}
        </div>

        <Textarea
          label="Description"
          rows={2}
          placeholder="Optional notes about this server"
          error={errors.description?.message}
          disabled={isSubmitting}
          {...register('description')}
        />

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
          {isEdit ? (
            <Checkbox
              label="Active"
              hint="Disabled servers stay in the list but are not used."
              disabled={isSubmitting}
              {...register('is_active')}
            />
          ) : null}
          {isEdit && needsPassword && server?.has_password ? (
            <Checkbox
              label="Clear stored password"
              hint="Remove the saved password on save."
              disabled={isSubmitting}
              {...register('clear_password')}
            />
          ) : null}
          {isEdit && needsPrivateKey && server?.has_private_key ? (
            <Checkbox
              label="Clear stored private key"
              hint="Remove the saved key and passphrase on save."
              disabled={isSubmitting}
              {...register('clear_private_key')}
            />
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
