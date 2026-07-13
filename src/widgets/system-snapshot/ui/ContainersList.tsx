import { useMemo, useState } from 'react';
import {
  Boxes,
  Container as ContainerIcon,
  Link2,
  Link2Off,
  Pause,
  Play,
  RotateCw,
  Search,
  Skull,
  Square,
} from 'lucide-react';
import { Card, Chip, Input, Skeleton, Tooltip, type ChipTone } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes, formatRelative } from '@entities/system';
import type {
  ContainerInfo,
  ContainerState,
  ContainersSnapshot,
  ImagesSnapshot,
} from '@entities/containers';
import { PanelTitle } from './PanelTitle';

export type ContainersListProps = {
  data: ContainersSnapshot | undefined;
  /**
   * Снапшот образов сервера. Если передан — каждый контейнер дополнительно
   * помечается чипом `linked` (образ в кеше хоста) или `external` (образа нет).
   */
  images?: ImagesSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
};

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
  if (restarting) {
    return <RotateCw size={11} aria-hidden className="animate-spin" />;
  }
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

function Unavailable({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Boxes size={20} aria-hidden className="text-fg-muted" />
      <p className="font-mono text-xs text-fg-muted">Docker containers unavailable</p>
      {reason ? (
        <p className="max-w-md break-words font-mono text-[10px] leading-relaxed text-fg-muted/80">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

/** Сортировка: running → restarting → paused → created → exited → dead. */
function statePriority(s: ContainerState): number {
  switch (s) {
    case 'running':
      return 0;
    case 'restarting':
      return 1;
    case 'paused':
      return 2;
    case 'created':
      return 3;
    case 'exited':
      return 4;
    case 'dead':
      return 5;
    default:
      return 6;
  }
}

function sortContainers(containers: ContainerInfo[]): ContainerInfo[] {
  return [...containers].sort((a, b) => {
    const ps = statePriority(a.state) - statePriority(b.state);
    if (ps !== 0) return ps;
    return a.name.localeCompare(b.name);
  });
}

/** Резолв «есть ли образ этого контейнера на сервере» — для подсветки orphan'ов. */
function buildImageIndex(images?: ImagesSnapshot): {
  has: (imageId: string, imageTag: string) => boolean;
} | null {
  if (!images?.available || !images.images.length) return null;
  const byId = new Set<string>();
  const byTag = new Set<string>();
  for (const img of images.images) {
    byId.add(img.id);
    byId.add(img.short_id);
    for (const t of img.repo_tags ?? []) byTag.add(t);
  }
  return {
    has: (imageId, imageTag) => {
      if (
        imageId &&
        (byId.has(imageId) ||
          byId.has(imageId.replace(/^sha256:/, '').slice(0, 12)))
      )
        return true;
      if (imageTag && byTag.has(imageTag)) return true;
      return false;
    },
  };
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
      title={port.ip ? port.ip : undefined}
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

function ContainerRow({
  container,
  imageBound,
}: {
  container: ContainerInfo;
  imageBound: boolean | null;
}) {
  const tone = STATE_TONE[container.state] ?? 'neutral';
  const ports = (container.ports ?? []).filter((p) => p.private_port > 0);
  const networks = container.networks ?? [];
  const mounts = container.mounts ?? [];

  // Цветная левая полоса по семантике состояния.
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
    <li className={cn('group flex flex-col gap-1.5 border-l-2 py-3 pl-3 pr-2 hover:bg-bg-1', borderClass)}>
      {/* Шапка: имя + state + здоровье + рестарты */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <ContainerIcon size={13} aria-hidden className="text-fg-muted" />
          <span className="truncate font-mono text-sm text-fg-primary">{container.name}</span>
          <span className="font-mono text-[10px] text-fg-muted">{container.short_id}</span>
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
        <div className="flex shrink-0 items-baseline gap-2 font-mono text-[11px] text-fg-muted">
          {container.started_at && container.running ? (
            <span>up {formatRelative(container.started_at)}</span>
          ) : null}
          {!container.running && container.finished_at ? (
            <span>
              exit {container.exit_code} · {formatRelative(container.finished_at)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Образ + связь */}
      <div className="flex flex-wrap items-center gap-2">
        {imageBound === null ? null : imageBound ? (
          <Tooltip content="Image is present in this server's image cache (intro)">
            <span className="inline-flex items-center gap-1 rounded-sm border border-state-success/40 bg-state-success-muted px-1.5 py-0.5 font-mono text-[10px] text-state-success">
              <Link2 size={11} aria-hidden /> linked
            </span>
          </Tooltip>
        ) : (
          <Tooltip content="Image is not in this server's image cache — orphaned or pulled-on-run (external)">
            <span className="inline-flex items-center gap-1 rounded-sm border border-state-warning/40 bg-state-warning-muted px-1.5 py-0.5 font-mono text-[10px] text-state-warning">
              <Link2Off size={11} aria-hidden /> external
            </span>
          </Tooltip>
        )}
        <span className="truncate font-mono text-xs text-fg-secondary" title={container.image}>
          {container.image}
        </span>
        {container.image_id ? (
          <span className="font-mono text-[10px] text-fg-muted" title={container.image_id}>
            {container.image_id.replace(/^sha256:/, '').slice(0, 12)}
          </span>
        ) : null}
      </div>

      {/* Status string из Docker */}
      {container.status ? (
        <p className="font-mono text-[10px] text-fg-muted">{container.status}</p>
      ) : null}

      {/* Ports */}
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

      {/* Networks / Mounts / policy / pid — компактные сводки */}
      {networks.length > 0 || mounts.length > 0 || container.restart_policy || container.pid > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 font-mono text-[10px] text-fg-muted">
          {networks.length > 0 ? (
            <span title={networks.map((n) => `${n.name}: ${n.ip_address}`).join('\n')}>
              networks{' '}
              <span className="text-fg-secondary">
                {networks.map((n) => n.name).join(', ')}
              </span>
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
    </li>
  );
}

/**
 * Детальный список Docker-контейнеров сервера с поиском по имени / образу / ID.
 *
 * Если передан `images`-снапшот, каждый контейнер дополнительно помечается
 * `linked` (образ в кеше — intro: ведёт к существующему image) или `external`
 * (образ не в кеше — extra: вытянут с registry или удалён локально).
 *
 * Слева у каждой строки цветная полоса по состоянию:
 *   зелёная   — running healthy,
 *   жёлтая    — running unhealthy / paused,
 *   синяя     — restarting / created,
 *   красная   — dead / oom_killed,
 *   серая     — exited.
 */
export function ContainersList({ data, images, isLoading, error }: ContainersListProps) {
  const [search, setSearch] = useState('');
  const imageIndex = useMemo(() => buildImageIndex(images), [images]);

  const filtered = useMemo(() => {
    const all = data?.containers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return sortContainers(all);
    return sortContainers(
      all.filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.short_id.toLowerCase().includes(q)) return true;
        if (c.id.toLowerCase().includes(q)) return true;
        if (c.image?.toLowerCase().includes(q)) return true;
        if (c.image_id?.toLowerCase().includes(q)) return true;
        if (c.state.toLowerCase().includes(q)) return true;
        return false;
      }),
    );
  }, [data, search]);

  const total = data?.count ?? 0;

  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle
        title="Containers"
        subtitle={`// ${total} on host`}
        actions={
          data ? (
            <Chip tone={data.available ? 'success' : 'error'} mono>
              {data.available ? 'AVAILABLE' : 'UNAVAILABLE'}
            </Chip>
          ) : undefined
        }
      />

      <Input
        placeholder="Search by name, image, ID or state…"
        leftIcon={<Search size={14} aria-hidden />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search containers"
      />

      {isLoading && !data ? (
        <Loading />
      ) : !data ? (
        <div className="py-8 text-center font-mono text-xs text-fg-muted">
          {error instanceof Error ? error.message : 'Failed to load containers'}
        </div>
      ) : !data.available ? (
        <Unavailable reason={data.reason} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <ContainerIcon size={20} aria-hidden className="text-fg-muted" />
          <p className="font-mono text-xs text-fg-muted">
            {search ? 'No containers match the search' : 'No containers on this host'}
          </p>
        </div>
      ) : (
        <ul className="max-h-[480px] divide-y divide-border-subtle overflow-y-auto rounded-md border border-border-subtle bg-bg-0/30">
          {filtered.map((c) => (
            <ContainerRow
              key={c.id}
              container={c}
              imageBound={imageIndex ? imageIndex.has(c.image_id, c.image) : null}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
