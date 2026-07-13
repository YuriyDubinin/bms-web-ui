import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Circle, MinusCircle, Trash2, XCircle } from 'lucide-react';
import { ApiError } from '@shared/api';
import { Button, Chip, Dialog, Input, Spinner, notify } from '@shared/ui';
import { cn } from '@shared/lib';
import { REMOTE_CONTAINERS_QUERY_KEY } from '@entities/containers';
import {
  PURGE_STEP_ORDER,
  PURGE_STEP_TITLES,
  usePurgeRemoteImage,
  type PurgeRequest,
  type PurgeResponse,
  type PurgeStep,
  type PurgeStepStatus,
  type Server,
} from '@entities/server';
import type { Registry, RegistryImage } from '@entities/registry';
import { purgeFormSchema, type PurgeFormValues } from '../model/purgeSchema';

export type ServerPurgeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: Server;
  registry: Registry;
  image: RegistryImage;
};

const FORM_ID = 'server-purge-form';

/** Дефолтные значения формы из выбранного registry-образа. */
function defaultsFromImage(image: RegistryImage): PurgeFormValues {
  const lastSegment = (image.name ?? '').split('/').pop() ?? '';
  const containerName =
    (lastSegment || image.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/^[._-]+/, '') || '';
  const tag = image.tags?.[0] ?? 'latest';
  return {
    image: image.name,
    tag,
    container_name: containerName,
  };
}

// ---------- Stepper результата ----------

// Для purge `skipped` — это норма (нечего было удалять), показываем спокойным серым,
// а не warning-жёлтым как в deploy.
const STEP_TONE: Record<PurgeStepStatus, 'success' | 'error' | 'neutral'> = {
  ok: 'success',
  skipped: 'neutral',
  failed: 'error',
  not_run: 'neutral',
};

function StepIcon({ status }: { status: PurgeStepStatus }) {
  switch (status) {
    case 'ok':
      return <Check size={13} aria-hidden className="text-state-success" />;
    case 'failed':
      return <XCircle size={13} aria-hidden className="text-state-error" />;
    case 'skipped':
      return <MinusCircle size={13} aria-hidden className="text-fg-muted" />;
    case 'not_run':
    default:
      return <Circle size={13} aria-hidden className="text-fg-muted" />;
  }
}

function StepRow({ step }: { step: PurgeStep }) {
  const tone = STEP_TONE[step.status as PurgeStepStatus] ?? 'neutral';
  return (
    <li
      className={cn(
        'flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2',
        tone === 'success' && 'border-l-state-success/60',
        tone === 'error' && 'border-l-state-error/70 bg-state-error-muted/30',
        tone === 'neutral' && 'border-l-border-subtle',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <StepIcon status={step.status as PurgeStepStatus} />
          <span className="truncate text-xs text-fg-primary">{step.title}</span>
          <Chip tone={tone} mono>
            {step.status}
          </Chip>
        </span>
        {typeof step.duration_ms === 'number' && step.duration_ms > 0 ? (
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-fg-muted">
            {step.duration_ms} ms
          </span>
        ) : null}
      </div>
      {step.message ? (
        <p className="break-words font-mono text-[10px] leading-relaxed text-fg-muted">
          {step.message}
        </p>
      ) : null}
    </li>
  );
}

/** Полный отчёт: баннер статуса + список 5 шагов. */
function ResultPanel({ response }: { response: PurgeResponse }) {
  const r = response.result;

  // SSH не получился — нет result.
  if (!response.connected) {
    return (
      <section className="flex flex-col gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-3">
        <div className="flex items-center gap-2">
          <XCircle size={14} aria-hidden className="text-state-error" />
          <span className="font-mono text-xs uppercase tracking-wider text-state-error">
            {response.status}
          </span>
        </div>
        <p className="break-words text-xs text-fg-secondary">{response.message}</p>
      </section>
    );
  }

  // SSH прошёл, но docker недоступен.
  if (r && !r.available) {
    return (
      <section className="flex flex-col gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden className="text-state-error" />
          <span className="font-mono text-xs uppercase tracking-wider text-state-error">
            Docker unavailable
          </span>
        </div>
        <p className="break-words text-xs text-fg-secondary">{r.reason ?? response.message}</p>
      </section>
    );
  }

  if (!r) return null;

  // Нормализуем шаги в фиксированном порядке (на случай если бэк изменит порядок).
  const stepByName = new Map(r.steps.map((s) => [s.name, s]));
  const orderedSteps: PurgeStep[] = PURGE_STEP_ORDER.map(
    (name) =>
      stepByName.get(name) ?? {
        name,
        title: PURGE_STEP_TITLES[name],
        status: 'not_run',
        message: '',
      },
  );

  return (
    <section className="flex flex-col gap-3">
      {/* Сводный баннер */}
      <div
        className={cn(
          'flex flex-col gap-1.5 rounded-md border px-3 py-3',
          r.success
            ? 'border-state-success/40 bg-state-success-muted/20'
            : 'border-state-error/40 bg-state-error-muted/30',
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            {r.success ? (
              <Check size={14} aria-hidden className="text-state-success" />
            ) : (
              <XCircle size={14} aria-hidden className="text-state-error" />
            )}
            <span
              className={cn(
                'font-mono text-xs font-semibold uppercase tracking-wider',
                r.success ? 'text-state-success' : 'text-state-error',
              )}
            >
              {r.success ? 'Purge completed' : 'Purge failed'}
            </span>
          </div>
          {typeof r.duration_ms === 'number' ? (
            <span className="font-mono text-[10px] tabular-nums text-fg-muted">
              {r.duration_ms} ms
            </span>
          ) : null}
        </div>
        <p className="break-all font-mono text-[11px] text-fg-secondary">{r.image_ref}</p>
        {r.container_name ? (
          <p className="font-mono text-[10px] text-fg-muted">container {r.container_name}</p>
        ) : null}
      </div>

      {/* Список шагов */}
      <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-bg-0/30">
        {orderedSteps.map((s) => (
          <StepRow key={s.name} step={s} />
        ))}
      </ul>
    </section>
  );
}

// ---------- Корневой компонент диалога ----------

export function ServerPurgeDialog({
  open,
  onOpenChange,
  server,
  registry,
  image,
}: ServerPurgeDialogProps) {
  const qc = useQueryClient();
  const purgeMut = usePurgeRemoteImage();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurgeFormValues>({
    resolver: zodResolver(purgeFormSchema),
    defaultValues: defaultsFromImage(image),
  });

  // Реинициализируем форму и сбрасываем результат при открытии / смене образа.
  useEffect(() => {
    if (open) {
      reset(defaultsFromImage(image));
      purgeMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, image.name, reset]);

  const watchedImage = watch('image');
  const watchedTag = watch('tag');

  const pending = purgeMut.isPending || isSubmitting;
  const result = purgeMut.data;
  const httpError = purgeMut.error;
  const success = !!result?.connected && !!result.result?.success;

  const onSubmit = handleSubmit(async (values) => {
    const body: PurgeRequest = {
      server_id: server.id,
      registry_id: registry.id,
      image: values.image.trim(),
      tag: values.tag.trim(),
      ...(values.container_name.trim() ? { container_name: values.container_name.trim() } : {}),
    };
    try {
      const res = await purgeMut.mutateAsync(body);
      if (res.connected && res.result?.success) {
        notify.success('Purge completed', { description: res.result.image_ref });
      } else if (!res.connected) {
        notify.error(res.status || 'SSH failed', { description: res.message, code: res.status });
      } else {
        const failed = res.result?.steps.find((s) => s.status === 'failed');
        notify.error('Purge failed', {
          description: failed?.message ?? res.message,
          code: failed?.name,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        notify.error(err.message || 'Purge request failed', { code: err.code });
      } else {
        notify.error('Purge request failed');
      }
    }
  });

  const close = (next: boolean) => {
    if (pending) return; // блокируем закрытие во время выполнения
    if (!next) {
      // Аналогично deploy: на закрытии обновляем список контейнеров CI/CD-вкладки.
      void qc.invalidateQueries({ queryKey: REMOTE_CONTAINERS_QUERY_KEY });
    }
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Purge image"
      description={`${watchedImage}:${watchedTag} → ${server.name}`}
      className="w-[min(94vw,640px)]"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)} disabled={pending}>
            {result && !success ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="destructive"
            loading={pending}
            leftIcon={<Trash2 size={14} aria-hidden />}
          >
            {result && !success ? 'Retry purge' : 'Purge'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Деструктивное предупреждение */}
        <div className="flex items-start gap-2 rounded-md border border-state-warning/40 bg-state-warning-muted/30 px-3 py-2.5 text-xs">
          <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-state-warning" />
          <div className="flex flex-col gap-1 text-fg-secondary">
            <span>
              Будут <strong className="text-fg-primary">остановлены и удалены ВСЕ контейнеры</strong>,
              использующие этот образ, и сам образ будет удалён с сервера.
            </span>
            <span className="text-fg-muted">Volumes контейнеров сохранятся — данные не теряются.</span>
          </div>
        </div>

        <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Image"
            required
            helper="Repository name (without tag). Combined with registry namespace."
            placeholder="bms-web-ui"
            disabled={pending}
            error={errors.image?.message}
            {...register('image')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tag"
              required
              placeholder="1.0.0"
              disabled={pending}
              error={errors.tag?.message}
              {...register('tag')}
            />
            <Input
              label="Container name"
              helper="Optional — also match this exact container."
              placeholder="bms-web-ui"
              disabled={pending}
              error={errors.container_name?.message}
              {...register('container_name')}
            />
          </div>
        </form>

        {/* Pending-индикатор */}
        {pending && !result ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-6 text-fg-secondary">
            <Spinner size={16} label="Purging" />
            <span className="text-sm">Purging — stopping & removing containers…</span>
          </div>
        ) : null}

        {/* HTTP-ошибка (валидация бэка / 4xx / 5xx) */}
        {!pending && httpError && !result ? (
          <div className="flex items-start gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-3">
            <XCircle size={14} aria-hidden className="mt-0.5 shrink-0 text-state-error" />
            <span className="break-words text-xs text-fg-secondary">
              {httpError instanceof ApiError
                ? `${httpError.code} · ${httpError.message}`
                : httpError.message || 'Purge request failed'}
            </span>
          </div>
        ) : null}

        {/* Полный отчёт по шагам */}
        {result ? <ResultPanel response={result} /> : null}
      </div>
    </Dialog>
  );
}
