import { useMemo, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  Container as ContainerIcon,
  Lock,
  Rocket,
  ScrollText,
  Trash2,
  X,
} from 'lucide-react';
import {
  Card,
  Chip,
  DataView,
  FadeIn,
  IconButton,
  Label,
  Tooltip,
  ViewToggle,
  type DataColumn,
  type ViewMode,
} from '@shared/ui';
import { cn, usePersistentState } from '@shared/lib';
import { formatRelative } from '@entities/system';
import {
  useRemoteContainersQuery,
  type ContainerInfo,
} from '@entities/containers';
import {
  useRegistriesQuery,
  type Registry,
  type RegistryImage,
} from '@entities/registry';
import { usePingPolling, type Server } from '@entities/server';
import { RegistryImagesDialog } from '@features/manage-registry';
import { ServerDeployDialog, ServerPurgeDialog } from '@features/manage-server';
import { ContainerLogsDialog, LiveIndicator } from '@widgets/system-snapshot';
import { ContainerCard, PortChip, StateIcon } from './ContainerCard';

export type ServerCicdTabProps = {
  server: Server;
};

const POLL_INTERVAL_MS = 3000;

// ---------- Маленькая плашка live-индикатора («поллинг сервера 3с») ----------

function CicdLivePill({
  status,
  active,
  fetching,
}: {
  status?: string;
  active: boolean;
  fetching: boolean;
}) {
  const ok = active && status?.toUpperCase() === 'OK';
  const tone = ok ? 'text-state-success' : active ? 'text-state-warning' : 'text-state-error';
  const label = ok ? 'ONLINE' : active ? (status ?? 'CHECKING') : 'OFFLINE';
  return (
    <section
      aria-label="Server liveness"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-border-subtle bg-bg-1 px-3 py-2"
    >
      <span className="inline-flex items-center gap-2">
        <span className={cn('relative inline-flex h-2 w-2 shrink-0', tone)}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
        </span>
        <span className={cn('font-mono text-[11px] font-semibold uppercase tracking-wider', tone)}>
          {label}
        </span>
        <span className="text-fg-muted/50">·</span>
        <span className="font-mono text-xs text-fg-secondary">ping every 3s</span>
      </span>
      <LiveIndicator fetching={fetching} intervalMs={POLL_INTERVAL_MS} />
    </section>
  );
}

// ---------- Полноширинный селектор образа (пустой / выбранный) ----------

/**
 * Полноширинный селектор образа. Два состояния:
 *  - empty: пунктирная рамка, плейсхолдер «pick an image…»;
 *  - selected: акцентная рамка, контент в стиле строки `RegistryImagesDialog`
 *    (имя, теги, private/public, tag count, последнее обновление) + кнопка сброса.
 * Клик по строке (везде кроме ×) открывает модалку выбора.
 */
function ImagePickerRow({
  image,
  disabled,
  placeholder,
  onPick,
  onClear,
  onDeploy,
  onPurge,
}: {
  image: RegistryImage | null;
  disabled?: boolean;
  placeholder?: string;
  onPick: () => void;
  onClear: () => void;
  onDeploy?: () => void;
  onPurge?: () => void;
}) {
  if (!image) {
    return (
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-md border border-dashed bg-bg-1 px-3 py-3 text-left',
          'border-border-subtle text-fg-muted',
          'transition-colors duration-150 ease-out',
          'hover:border-border-strong hover:text-fg-secondary hover:bg-bg-2',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-0',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Boxes size={14} aria-hidden />
          <span className="truncate font-mono text-xs">
            {placeholder ?? 'Pick an image to filter containers…'}
          </span>
        </span>
        <ChevronDown size={14} aria-hidden className="shrink-0" />
      </button>
    );
  }

  const tags = image.tags ?? [];
  const firstTag = tags[0];
  const extraTags = Math.max(0, tags.length - 1);

  return (
    <div className="flex items-start gap-3 rounded-md border border-accent/40 bg-bg-1 px-3 py-3">
      {/* Клик по основной области = переоткрыть модалку */}
      <button
        type="button"
        onClick={onPick}
        aria-label="Change selected image"
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-1.5 text-left',
          'focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-mono text-sm text-fg-primary" title={image.name}>
              {image.name}
            </span>
            {image.is_private != null ? (
              <Chip tone={image.is_private ? 'warning' : 'neutral'} mono>
                {image.is_private ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock size={10} aria-hidden /> private
                  </span>
                ) : (
                  'public'
                )}
              </Chip>
            ) : null}
            {firstTag ? (
              <Chip tone="accent" mono>
                {firstTag}
              </Chip>
            ) : null}
            {extraTags > 0 ? (
              <span
                className="font-mono text-[10px] text-fg-muted"
                title={tags.slice(1).join('\n')}
              >
                +{extraTags} {extraTags === 1 ? 'tag' : 'tags'}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-2 font-mono text-[11px] tabular-nums text-fg-muted">
            <span>
              {image.tag_count} tag{image.tag_count === 1 ? '' : 's'}
            </span>
            {image.last_updated ? <span>· updated {formatRelative(image.last_updated)}</span> : null}
          </div>
        </div>
      </button>

      {onDeploy ? (
        <Tooltip content="Deploy this image to the server">
          <IconButton
            aria-label="Deploy this image"
            size="sm"
            onClick={onDeploy}
            className="border border-accent/40 bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent"
          >
            <Rocket size={13} aria-hidden className="drop-shadow-[0_0_4px_currentColor]" />
          </IconButton>
        </Tooltip>
      ) : null}

      {onPurge ? (
        <Tooltip content="Purge this image and its containers from the server">
          <IconButton
            aria-label="Purge this image"
            size="sm"
            onClick={onPurge}
            className="border border-state-error/40 bg-state-error-muted text-state-error hover:bg-state-error-muted hover:text-state-error"
          >
            <Trash2 size={13} aria-hidden />
          </IconButton>
        </Tooltip>
      ) : null}

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selected image"
        className={cn(
          'shrink-0 self-start rounded-md p-1 text-fg-muted',
          'transition-colors duration-150 ease-out',
          'hover:bg-bg-2 hover:text-fg-primary',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}

// ---------- Сортировка / стейт-чипы ----------

function statePriority(s: string): number {
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

const STATE_TONE_CHIP: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent'> = {
  running: 'success',
  exited: 'neutral',
  paused: 'warning',
  restarting: 'info',
  created: 'info',
  dead: 'error',
};

function containerColumns(handlers: {
  onLogs?: (container: ContainerInfo) => void;
}): DataColumn<ContainerInfo>[] {
  const cols: DataColumn<ContainerInfo>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (c) => (
        <span className="inline-flex flex-col">
          <span className="font-mono text-sm text-fg-primary">{c.name}</span>
          <span className="font-mono text-[10px] text-fg-muted">{c.short_id}</span>
        </span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      cell: (c) => (
        <span className="inline-flex flex-wrap items-center gap-1">
          <Chip tone={STATE_TONE_CHIP[c.state] ?? 'neutral'} mono>
            <span className="inline-flex items-center gap-1">
              <StateIcon state={c.state} restarting={c.restarting} />
              {c.state}
            </span>
          </Chip>
          {c.health && c.health !== '' ? (
            <Chip
              tone={
                c.health === 'healthy' ? 'success' : c.health === 'unhealthy' ? 'error' : 'info'
              }
              mono
            >
              {c.health}
            </Chip>
          ) : null}
          {c.restart_count > 0 ? (
            <Chip tone="warning" mono>
              ↻ {c.restart_count}
            </Chip>
          ) : null}
          {c.oom_killed ? (
            <Chip tone="error" mono>
              OOM
            </Chip>
          ) : null}
        </span>
      ),
    },
    {
      key: 'image',
      header: 'Image',
      cell: (c) => (
        <span className="inline-flex max-w-[260px] flex-col">
          <span className="truncate font-mono text-xs text-fg-secondary" title={c.image}>
            {c.image}
          </span>
          {c.image_id ? (
            <span className="font-mono text-[10px] text-fg-muted" title={c.image_id}>
              {c.image_id.replace(/^sha256:/, '').slice(0, 12)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => (
        <span className="font-mono text-[11px] text-fg-muted" title={c.status}>
          {c.status || '—'}
        </span>
      ),
    },
    {
      key: 'ports',
      header: 'Ports',
      cell: (c) => {
        const ports = (c.ports ?? []).filter((p) => p.private_port > 0);
        if (ports.length === 0) {
          return <span className="font-mono text-[10px] text-fg-muted">—</span>;
        }
        return (
          <span className="inline-flex max-w-[220px] flex-wrap gap-1">
            {ports.slice(0, 3).map((p, i) => (
              <PortChip key={`${p.private_port}-${p.type}-${i}`} port={p} />
            ))}
            {ports.length > 3 ? (
              <span className="font-mono text-[10px] text-fg-muted">+{ports.length - 3}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: 'created',
      header: 'Created',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-[11px] text-fg-muted">{formatRelative(c.created_at)}</span>
      ),
    },
  ];

  if (handlers.onLogs) {
    cols.push({
      key: 'logs',
      header: 'Logs',
      align: 'center',
      cellClassName: 'w-0 whitespace-nowrap',
      cell: (c) => (
        <span className="inline-flex justify-center">
          <Tooltip content="View logs">
            <IconButton
              aria-label="View container logs"
              size="sm"
              onClick={() => handlers.onLogs?.(c)}
            >
              <ScrollText size={13} aria-hidden />
            </IconButton>
          </Tooltip>
        </span>
      ),
    });
  }

  return cols;
}

/**
 * Контейнер относится к выбранному registry-образу. Матчим по строковому
 * совпадению: контейнерный image-reference содержит имя из каталога (или его
 * последний сегмент). Это нестрого, но в реальности достаточно: regenerated
 * локальный hash образа никогда не совпадёт с тегом из registry-каталога,
 * поэтому матчим по имени, а не по sha.
 */
function containerMatchesRegistryImage(c: ContainerInfo, img: RegistryImage): boolean {
  const cImage = (c.image ?? '').toLowerCase();
  const imgName = (img.name ?? '').toLowerCase();
  if (!cImage || !imgName) return false;
  if (cImage.includes(imgName)) return true;
  const lastSeg = imgName.split('/').pop();
  if (lastSeg && cImage.includes(lastSeg)) return true;
  return false;
}

/** Выбор регистри для модалки: default → первый активный → первый из списка. */
function pickRegistry(registries: Registry[]): Registry | null {
  if (registries.length === 0) return null;
  return (
    registries.find((r) => r.is_default) ??
    registries.find((r) => r.is_active) ??
    registries[0] ??
    null
  );
}

// ---------- Корневая вкладка ----------

export function ServerCicdTab({ server }: ServerCicdTabProps) {
  // Фоновый пинг сервера 3с — оставляем индикатор живости.
  const pingQ = usePingPolling(server.id);
  // Контейнеры этого сервера (через SSH).
  const containersQ = useRemoteContainersQuery(server.id);
  // Список зарегистрированных Docker Registry — нужен, чтобы выбрать, у какого
  // спрашивать каталог образов. Берём default → active → первый из списка.
  const registriesQ = useRegistriesQuery({ page: 1, page_size: 100 });
  const registry = useMemo(
    () => pickRegistry(registriesQ.data?.items ?? []),
    [registriesQ.data],
  );

  const [imagesOpen, setImagesOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<RegistryImage | null>(null);
  /** Контейнер, для которого открыта модалка логов. null = модалка закрыта. */
  const [logsFor, setLogsFor] = useState<ContainerInfo | null>(null);
  // Выбор «таблица / карточки» переживает перезагрузку.
  const [view, setView] = usePersistentState<ViewMode>(
    'page.server-cicd.containers.view',
    'table',
    (raw): raw is ViewMode => raw === 'table' || raw === 'cards',
  );

  const data = containersQ.data;
  const sorted = useMemo(() => {
    const list = data?.containers ?? [];
    const filtered = selectedImage
      ? list.filter((c) => containerMatchesRegistryImage(c, selectedImage))
      : list;
    return [...filtered].sort((a, b) => {
      const ps = statePriority(a.state) - statePriority(b.state);
      if (ps !== 0) return ps;
      return a.name.localeCompare(b.name);
    });
  }, [data, selectedImage]);

  const columns = useMemo(
    () => containerColumns({ onLogs: (c) => setLogsFor(c) }),
    [],
  );

  return (
    <FadeIn distance={4}>
      <div className="space-y-4">
        <CicdLivePill
          status={pingQ.data?.status ?? server.last_status}
          active={server.is_active}
          fetching={pingQ.isFetching}
        />

        <div className="flex flex-col gap-1.5">
          <Label>Images</Label>
          <ImagePickerRow
            image={selectedImage}
            disabled={!registry}
            placeholder={
              registry
                ? `Pick an image from ${registry.name} to filter containers…`
                : 'No registries configured — add one to browse images'
            }
            onPick={() => setImagesOpen(true)}
            onClear={() => setSelectedImage(null)}
            onDeploy={registry && selectedImage ? () => setDeployOpen(true) : undefined}
            onPurge={registry && selectedImage ? () => setPurgeOpen(true) : undefined}
          />
        </div>
        {registry ? (
          <RegistryImagesDialog
            open={imagesOpen}
            onOpenChange={setImagesOpen}
            registry={registry}
            onSelect={(img) => {
              setSelectedImage(img);
              setImagesOpen(false);
            }}
          />
        ) : null}
        {registry && selectedImage ? (
          <ServerDeployDialog
            open={deployOpen}
            onOpenChange={setDeployOpen}
            server={server}
            registry={registry}
            image={selectedImage}
          />
        ) : null}
        {registry && selectedImage ? (
          <ServerPurgeDialog
            open={purgeOpen}
            onOpenChange={setPurgeOpen}
            server={server}
            registry={registry}
            image={selectedImage}
          />
        ) : null}

        {logsFor ? (
          <ContainerLogsDialog
            open
            onOpenChange={(next) => {
              if (!next) setLogsFor(null);
            }}
            serverId={server.id}
            container={logsFor.name}
          />
        ) : null}

        {/* Контейнеры: тулбар + DataView (таблица / карточки) */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Label>
            Containers
            {selectedImage ? (
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                · filtered by image
              </span>
            ) : null}
          </Label>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {data && !data.available ? (
          <Card>
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <ContainerIcon size={20} aria-hidden className="text-fg-muted" />
              <p className="font-mono text-xs text-fg-muted">Docker containers unavailable</p>
              {data.reason ? (
                <p className="max-w-md break-words font-mono text-[10px] leading-relaxed text-fg-muted/80">
                  {data.reason}
                </p>
              ) : null}
            </div>
          </Card>
        ) : (
          <DataView<ContainerInfo>
            items={sorted}
            columns={columns}
            renderCard={(c) => <ContainerCard container={c} onLogs={setLogsFor} />}
            getRowKey={(c) => c.id}
            view={view}
            isLoading={containersQ.isLoading || (containersQ.isFetching && sorted.length === 0)}
            empty={
              <Card>
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <ContainerIcon size={20} aria-hidden className="text-fg-muted" />
                  <p className="font-mono text-xs text-fg-muted">
                    {selectedImage
                      ? 'No containers built from this image on the host'
                      : 'No containers on this host'}
                  </p>
                </div>
              </Card>
            }
          />
        )}
      </div>
    </FadeIn>
  );
}
