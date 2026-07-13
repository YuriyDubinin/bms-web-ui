import {
  Container as ContainerIcon,
  Pause,
  Play,
  RotateCw,
  ScrollText,
  Skull,
  Square,
} from 'lucide-react';
import { Card, Chip, Tooltip, type ChipTone } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes, formatRelative } from '@entities/system';
import type { ContainerInfo, ContainerState } from '@entities/containers';

const STATE_TONE: Record<string, ChipTone> = {
  running: 'success',
  exited: 'neutral',
  paused: 'warning',
  restarting: 'info',
  created: 'info',
  dead: 'error',
};

/** Иконка состояния контейнера — анимированная для restarting. */
function StateIcon({ state, restarting }: { state: ContainerState; restarting: boolean }) {
  if (restarting) return <RotateCw size={11} aria-hidden className="animate-spin" />;
  switch (state) {
    case 'running':
      return <Play size={11} aria-hidden />;
    case 'paused':
      return <Pause size={11} aria-hidden />;
    case 'dead':
      return <Skull size={11} aria-hidden />;
    case 'exited':
    case 'created':
    default:
      return <Square size={11} aria-hidden />;
  }
}

function formatCpus(nano: number): string {
  if (!nano || nano <= 0) return '—';
  return `${(nano / 1e9).toFixed(2)} CPU`;
}

function PortChip({
  port,
}: {
  port: { ip: string; private_port: number; public_port: number; type: string };
}) {
  const exposed = port.public_port > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px]',
        exposed
          ? 'border-state-success/40 bg-state-success-muted text-state-success'
          : 'border-border-subtle bg-bg-2 text-fg-muted',
      )}
      title={port.ip || undefined}
    >
      {exposed ? (
        <>
          <span>{port.public_port}</span>
          <span className="text-fg-muted">→</span>
          <span>{port.private_port}</span>
        </>
      ) : (
        <span>{port.private_port}</span>
      )}
      <span className="text-fg-muted">/{port.type}</span>
    </span>
  );
}

export type ContainerCardProps = {
  container: ContainerInfo;
  /** Если передан — справа в нижней плашке появляется кнопка-иконка логов. */
  onLogs?: (container: ContainerInfo) => void;
};

/**
 * Карточка контейнера с полной информацией. Слева — цветная полоса по
 * семантике состояния (running healthy → зелёная, unhealthy/paused → жёлтая,
 * restarting/created → синяя, dead/oom → красная, exited → серая).
 */
export function ContainerCard({ container, onLogs }: ContainerCardProps) {
  const tone = STATE_TONE[container.state] ?? 'neutral';
  const ports = (container.ports ?? []).filter((p) => p.private_port > 0);
  const networks = container.networks ?? [];
  const mounts = container.mounts ?? [];

  const borderClass =
    container.dead || container.oom_killed
      ? 'border-l-state-error'
      : container.running && container.health === 'unhealthy'
        ? 'border-l-state-warning'
        : container.running
          ? 'border-l-state-success'
          : container.restarting
            ? 'border-l-state-info'
            : 'border-l-border-subtle';

  return (
    <Card className={cn('flex h-full flex-col gap-2.5 border-l-2 transition-colors', borderClass)}>
      {/* Шапка: имя + state + здоровье + рестарты.
          На узких экранах имя занимает свою строку, чипы переносятся ниже. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
          <ContainerIcon size={13} aria-hidden className="shrink-0 text-fg-muted" />
          <span
            className="min-w-0 truncate font-mono text-sm text-fg-primary"
            title={container.name}
          >
            {container.name}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-fg-muted">
            {container.short_id}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <Chip tone={tone} mono>
            <span className="inline-flex items-center gap-1">
              <StateIcon state={container.state} restarting={container.restarting} />
              {container.state}
            </span>
          </Chip>
          {container.health && container.health !== '' ? (
            <Chip
              tone={
                container.health === 'healthy'
                  ? 'success'
                  : container.health === 'unhealthy'
                    ? 'error'
                    : 'info'
              }
              mono
            >
              {container.health}
            </Chip>
          ) : null}
          {container.restart_count > 0 ? (
            <Chip tone="warning" mono>
              ↻ {container.restart_count}
            </Chip>
          ) : null}
          {container.oom_killed ? (
            <Chip tone="error" mono>
              OOM
            </Chip>
          ) : null}
        </div>
      </div>

      {/* Образ */}
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          image
        </span>
        <span
          className="min-w-0 max-w-full truncate font-mono text-xs text-fg-secondary"
          title={container.image}
        >
          {container.image}
        </span>
        {container.image_id ? (
          <span
            className="shrink-0 font-mono text-[10px] text-fg-muted"
            title={container.image_id}
          >
            {container.image_id.replace(/^sha256:/, '').slice(0, 12)}
          </span>
        ) : null}
      </div>

      {container.status ? (
        <p className="font-mono text-[10px] text-fg-muted">{container.status}</p>
      ) : null}

      {ports.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">ports</span>
          {ports.map((p, i) => (
            <PortChip key={`${p.private_port}-${p.type}-${i}`} port={p} />
          ))}
        </div>
      ) : null}

      {/* Лимиты / размеры */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 font-mono text-[10px] text-fg-muted">
        <span>
          mem {container.limits.memory_bytes > 0 ? formatBytes(container.limits.memory_bytes) : '—'}
        </span>
        <span>cpu {formatCpus(container.limits.nano_cpus)}</span>
        {container.size_rw_bytes > 0 ? <span>rw {formatBytes(container.size_rw_bytes)}</span> : null}
        {container.size_root_fs_bytes > 0 ? (
          <span>root {formatBytes(container.size_root_fs_bytes)}</span>
        ) : null}
      </div>

      {/* Сети / маунты / policy / pid */}
      {networks.length > 0 || mounts.length > 0 || container.restart_policy || container.pid > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 font-mono text-[10px] text-fg-muted">
          {networks.length > 0 ? (
            <span title={networks.map((n) => `${n.name}: ${n.ip_address}`).join('\n')}>
              networks{' '}
              <span className="text-fg-secondary">{networks.map((n) => n.name).join(', ')}</span>
            </span>
          ) : null}
          {mounts.length > 0 ? (
            <span title={mounts.map((m) => `${m.source} → ${m.destination} (${m.mode})`).join('\n')}>
              mounts <span className="text-fg-secondary">{mounts.length}</span>
            </span>
          ) : null}
          {container.restart_policy ? (
            <span>
              restart <span className="text-fg-secondary">{container.restart_policy}</span>
            </span>
          ) : null}
          {container.pid > 0 ? (
            <span>
              pid <span className="text-fg-secondary">{container.pid}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Нижняя плашка: время + actions */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-2 font-mono text-[10px] text-fg-muted">
        <span className="min-w-0 truncate">
          {container.running && container.started_at ? (
            <>up {formatRelative(container.started_at)}</>
          ) : !container.running && container.finished_at ? (
            <>
              exit {container.exit_code} · {formatRelative(container.finished_at)}
            </>
          ) : (
            <>created {formatRelative(container.created_at)}</>
          )}
        </span>
        {onLogs ? (
          <Tooltip content="View logs">
            <button
              type="button"
              aria-label="View container logs"
              onClick={() => onLogs(container)}
              className={cn(
                'shrink-0 rounded-md p-1 text-fg-muted',
                'transition-colors duration-150 ease-out',
                'hover:bg-bg-2 hover:text-fg-primary',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <ScrollText size={13} aria-hidden />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </Card>
  );
}

export { StateIcon, PortChip };
