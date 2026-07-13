import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  Circle,
  MinusCircle,
  Plus,
  Rocket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ApiError } from '@shared/api';
import { Button, Chip, Dialog, IconButton, Input, Label, Select, Spinner, notify } from '@shared/ui';
import { cn } from '@shared/lib';
import { REMOTE_CONTAINERS_QUERY_KEY } from '@entities/containers';
import {
  DEPLOY_RESTART_POLICIES,
  DEPLOY_STEP_ORDER,
  DEPLOY_STEP_TITLES,
  isDeployDowntimeState,
  useDeployRemoteServer,
  type DeployRequest,
  type DeployResponse,
  type DeployStep,
  type DeployStepStatus,
  type Server,
} from '@entities/server';
import type { Registry, RegistryImage } from '@entities/registry';
import { deployFormSchema, type DeployFormValues } from '../model/deploySchema';

export type ServerDeployDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: Server;
  registry: Registry;
  image: RegistryImage;
};

const FORM_ID = 'server-deploy-form';

const RESTART_POLICY_OPTIONS = DEPLOY_RESTART_POLICIES.map((v) => ({ value: v, label: v }));

/** Дефолтные значения формы из выбранного registry-образа. */
function defaultsFromImage(image: RegistryImage): DeployFormValues {
  const lastSegment = (image.name ?? '').split('/').pop() ?? '';
  const containerName =
    (lastSegment || image.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/^[._-]+/, '') || 'app';
  const tag = image.tags?.[0] ?? 'latest';
  return {
    image: image.name,
    tag,
    container_name: containerName,
    ports: [{ host: '3000', container: '80' }],
    restart_policy: 'unless-stopped',
  };
}

// ---------- Stepper результата ----------

const STEP_TONE: Record<DeployStepStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ok: 'success',
  skipped: 'warning',
  failed: 'error',
  not_run: 'neutral',
};

function StepIcon({ status }: { status: DeployStepStatus }) {
  switch (status) {
    case 'ok':
      return <Check size={13} aria-hidden className="text-state-success" />;
    case 'failed':
      return <XCircle size={13} aria-hidden className="text-state-error" />;
    case 'skipped':
      return <MinusCircle size={13} aria-hidden className="text-state-warning" />;
    case 'not_run':
    default:
      return <Circle size={13} aria-hidden className="text-fg-muted" />;
  }
}

function StepRow({ step }: { step: DeployStep }) {
  const tone = STEP_TONE[step.status as DeployStepStatus] ?? 'neutral';
  return (
    <li
      className={cn(
        'flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2',
        tone === 'success' && 'border-l-state-success/60',
        tone === 'error' && 'border-l-state-error/70 bg-state-error-muted/30',
        tone === 'warning' && 'border-l-state-warning/60',
        tone === 'neutral' && 'border-l-border-subtle',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <StepIcon status={step.status as DeployStepStatus} />
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

/** Полный отчёт: баннер статуса + список 7 шагов. */
function ResultPanel({ response }: { response: DeployResponse }) {
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

  const downtime = isDeployDowntimeState(r);
  const successTone = r.success ? 'success' : 'error';
  // Нормализуем шаги в фиксированном порядке (на случай если бэк изменит порядок).
  const stepByName = new Map(r.steps.map((s) => [s.name, s]));
  const orderedSteps: DeployStep[] = DEPLOY_STEP_ORDER.map(
    (name) =>
      stepByName.get(name) ?? {
        name,
        title: DEPLOY_STEP_TITLES[name],
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
          successTone === 'success'
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
              {r.success ? 'Deploy succeeded' : 'Deploy failed'}
            </span>
          </div>
          {typeof r.duration_ms === 'number' ? (
            <span className="font-mono text-[10px] tabular-nums text-fg-muted">
              {r.duration_ms} ms
            </span>
          ) : null}
        </div>
        <p className="break-all font-mono text-[11px] text-fg-secondary">{r.image_ref}</p>
        {r.container_id ? (
          <p className="font-mono text-[10px] text-fg-muted">
            container {r.container_id.replace(/^sha256:/, '').slice(0, 12)}
          </p>
        ) : null}
      </div>

      {/* Подсветка «опасного состояния» */}
      {downtime ? (
        <div className="flex items-start gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-2 text-xs">
          <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-state-error" />
          <span className="text-fg-secondary">
            Старый контейнер уже снесён, а новый не запустился — сервис в простое.
            Попробуйте задеплоить рабочую версию.
          </span>
        </div>
      ) : null}

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

export function ServerDeployDialog({
  open,
  onOpenChange,
  server,
  registry,
  image,
}: ServerDeployDialogProps) {
  const qc = useQueryClient();
  const deployMut = useDeployRemoteServer();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeployFormValues>({
    resolver: zodResolver(deployFormSchema),
    defaultValues: defaultsFromImage(image),
  });

  const portsArray = useFieldArray({ control, name: 'ports' });

  // Реинициализируем форму и сбрасываем результат при открытии / смене образа.
  useEffect(() => {
    if (open) {
      reset(defaultsFromImage(image));
      deployMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, image.name, reset]);

  const watchedImage = watch('image');
  const watchedTag = watch('tag');

  const pending = deployMut.isPending || isSubmitting;
  const result = deployMut.data;
  const httpError = deployMut.error;
  const success = !!result?.connected && !!result.result?.success;

  const onSubmit = handleSubmit(async (values) => {
    const body: DeployRequest = {
      server_id: server.id,
      registry_id: registry.id,
      image: values.image.trim(),
      tag: values.tag.trim(),
      container_name: values.container_name.trim(),
      ports: values.ports.map((p) => ({ host: Number(p.host), container: Number(p.container) })),
      restart_policy: values.restart_policy,
    };
    try {
      const res = await deployMut.mutateAsync(body);
      // Список контейнеров инвалидируем только при ручном закрытии диалога —
      // пока модалка открыта, пользователь должен видеть отчёт деплоя без
      // подёргиваний CI/CD-вкладки под ней.

      if (res.connected && res.result?.success) {
        notify.success('Deploy succeeded', { description: res.result.image_ref });
      } else if (!res.connected) {
        notify.error(res.status || 'SSH failed', { description: res.message, code: res.status });
      } else {
        const failed = res.result?.steps.find((s) => s.status === 'failed');
        notify.error('Deploy failed', {
          description: failed?.message ?? res.message,
          code: failed?.name,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        notify.error(err.message || 'Deploy request failed', { code: err.code });
      } else {
        notify.error('Deploy request failed');
      }
    }
  });

  const close = (next: boolean) => {
    if (pending) return; // блокируем закрытие во время выполнения
    if (!next) {
      // Даже если деплоя ещё не было — пользователь мог что-то сделать руками;
      // дёшево гарантируем, что CI/CD-вкладка покажет свежий список контейнеров.
      void qc.invalidateQueries({ queryKey: REMOTE_CONTAINERS_QUERY_KEY });
    }
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Deploy"
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
            loading={pending}
            leftIcon={<Rocket size={14} aria-hidden />}
          >
            {result && !success ? 'Retry deploy' : 'Deploy'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Image"
            required
            helper="Repository name (without tag). Will be combined with registry namespace."
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
              required
              placeholder="bms-web-ui"
              disabled={pending}
              error={errors.container_name?.message}
              {...register('container_name')}
            />
          </div>

          <Select
            label="Restart policy"
            options={RESTART_POLICY_OPTIONS}
            disabled={pending}
            error={errors.restart_policy?.message}
            {...register('restart_policy')}
          />

          {/* Порты — динамический список host→container */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Ports</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus size={12} aria-hidden />}
                disabled={pending || portsArray.fields.length >= 20}
                onClick={() => portsArray.append({ host: '', container: '' })}
              >
                Add port
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {portsArray.fields.map((field, i) => {
                const portsError = errors.ports;
                // Top-level message (e.g., refine: unique host)
                const rootMsg =
                  i === 0 && portsError && 'message' in portsError ? portsError.message : undefined;
                const hostErr = errors.ports?.[i]?.host?.message;
                const containerErr = errors.ports?.[i]?.container?.message;
                return (
                  <div key={field.id} className="flex flex-col gap-1">
                    <div className="flex items-end gap-2">
                      <Input
                        label={i === 0 ? 'Host' : undefined}
                        placeholder="3000"
                        inputMode="numeric"
                        disabled={pending}
                        error={hostErr}
                        containerClassName="flex-1"
                        {...register(`ports.${i}.host` as const)}
                      />
                      <span className="mb-2 self-end font-mono text-xs text-fg-muted">→</span>
                      <Input
                        label={i === 0 ? 'Container' : undefined}
                        placeholder="80"
                        inputMode="numeric"
                        disabled={pending}
                        error={containerErr}
                        containerClassName="flex-1"
                        {...register(`ports.${i}.container` as const)}
                      />
                      <IconButton
                        size="sm"
                        aria-label="Remove port"
                        onClick={() => portsArray.remove(i)}
                        disabled={pending || portsArray.fields.length <= 1}
                        className="mb-1"
                      >
                        <Trash2 size={13} aria-hidden />
                      </IconButton>
                    </div>
                    {rootMsg ? (
                      <p className="text-xs text-state-error" role="alert">
                        {rootMsg}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Pending-индикатор: пока ждём ответа — спиннер с подсказкой */}
        {pending && !result ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-6 text-fg-secondary">
            <Spinner size={16} label="Deploying" />
            <span className="text-sm">Deploying — typically takes 5–60 seconds…</span>
          </div>
        ) : null}

        {/* HTTP-ошибка (валидация бэка / 4xx / 5xx) */}
        {!pending && httpError && !result ? (
          <div className="flex items-start gap-2 rounded-md border border-state-error/40 bg-state-error-muted/30 px-3 py-3">
            <XCircle size={14} aria-hidden className="mt-0.5 shrink-0 text-state-error" />
            <span className="break-words text-xs text-fg-secondary">
              {httpError instanceof ApiError
                ? `${httpError.code} · ${httpError.message}`
                : httpError.message || 'Deploy request failed'}
            </span>
          </div>
        ) : null}

        {/* Полный отчёт по шагам */}
        {result ? <ResultPanel response={result} /> : null}
      </div>
    </Dialog>
  );
}
