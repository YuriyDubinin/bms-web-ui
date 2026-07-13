import { Boxes } from 'lucide-react';
import { Card, Chip, Skeleton, Sparkline, StatField } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes, formatCount } from '@entities/system';
import {
  containersFootprintBytes,
  summarizeContainers,
  type ContainerStateSummary,
  type ContainersSnapshot,
} from '@entities/containers';
import { PanelTitle } from './PanelTitle';

export type ContainersPanelProps = {
  /** Снапшот контейнеров. Для remote синтезируется `select`-функцией в хуке. */
  data: ContainersSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
};

type Segment = {
  key: keyof Omit<ContainerStateSummary, 'total'>;
  label: string;
  barClass: string;
  dotClass: string;
};

const SEGMENTS: Segment[] = [
  { key: 'running', label: 'running', barClass: 'bg-state-success', dotClass: 'bg-state-success' },
  { key: 'paused', label: 'paused', barClass: 'bg-state-warning', dotClass: 'bg-state-warning' },
  { key: 'restarting', label: 'restarting', barClass: 'bg-state-info', dotClass: 'bg-state-info' },
  { key: 'stopped', label: 'stopped', barClass: 'bg-fg-muted', dotClass: 'bg-fg-muted' },
];

function StateBar({ summary }: { summary: ContainerStateSummary }) {
  const total = summary.total || 1;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-sm bg-bg-2">
      {SEGMENTS.map((s) => {
        const value = summary[s.key];
        if (value <= 0) return null;
        return (
          <div
            key={s.key}
            className={cn('h-full transition-[width] duration-300 ease-out', s.barClass)}
            style={{ width: `${(value / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

function LegendRow({ segment, value }: { segment: Segment; value: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2">
        <span aria-hidden className={cn('h-2 w-2 rounded-full', segment.dotClass)} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-secondary">
          {segment.label}
        </span>
      </span>
      <span className="font-mono text-sm tabular-nums text-fg-primary">{value}</span>
    </div>
  );
}

function ContainersUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Boxes size={20} aria-hidden className="text-fg-muted" />
      <p className="font-mono text-xs text-fg-muted">Docker unavailable</p>
      {reason ? (
        <p className="max-w-md break-words font-mono text-[10px] leading-relaxed text-fg-muted/80">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

function ContainersSummary({ data }: { data: ContainersSnapshot }) {
  const summary = summarizeContainers(data);
  const footprint = containersFootprintBytes(data);
  const engine = data.engine;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Левая часть: суммы + распределение состояний */}
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-4">
          <div>
            <div className="font-mono text-3xl tabular-nums text-fg-primary">{summary.total}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              containers
            </div>
          </div>
          <div className="flex items-baseline gap-3 pb-1">
            <span className="font-mono text-sm tabular-nums text-state-success">
              {summary.running} up
            </span>
            <span className="font-mono text-sm tabular-nums text-fg-muted">
              {summary.total - summary.running} down
            </span>
          </div>
        </div>

        <StateBar summary={summary} />

        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {SEGMENTS.map((s) => (
            <LegendRow key={s.key} segment={s} value={summary[s.key]} />
          ))}
        </div>
      </div>

      {/* Правая часть: тренд running + контекст движка */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              running trend
            </span>
            <span className="font-mono text-xs tabular-nums text-fg-primary">
              {summary.running}/{summary.total}
            </span>
          </div>
          <div className="mt-2">
            <Sparkline
              value={summary.running}
              sampledAt={data.collected_at}
              max={Math.max(summary.total, 1)}
              height={40}
              strokeClassName="text-state-success"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
          <StatField label="images" value={formatCount(engine?.images_total ?? 0)} mono />
          <StatField label="footprint" value={formatBytes(footprint)} mono />
          <StatField label="host cpu" value={engine ? `${engine.ncpu}` : '—'} mono />
          <StatField
            label="host mem"
            value={engine ? formatBytes(engine.memory_total_bytes) : '—'}
            mono
          />
        </div>
      </div>
    </div>
  );
}

function ContainersLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/**
 * Презентационная панель Containers. Источник данных — внешний хук:
 *  - Core/Main → useContainersQuery() (локальный /api/system/containers);
 *  - Server/Main → useRemoteContainersQuery(serverId) (удалённый, с `select`,
 *    который синтезирует unavailable-снимок при SSH-провале).
 */
export function ContainersPanel({ data, isLoading, error }: ContainersPanelProps) {
  const engineVersion = data?.available && data.engine ? `v${data.engine.version}` : null;

  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle
        title="Containers"
        subtitle={'// docker engine'}
        actions={
          data ? (
            <Chip tone={data.available ? 'success' : 'error'} mono>
              {data.available ? (engineVersion ?? 'AVAILABLE') : 'UNAVAILABLE'}
            </Chip>
          ) : undefined
        }
      />

      {isLoading && !data ? (
        <ContainersLoading />
      ) : !data ? (
        <div className="py-8 text-center font-mono text-xs text-fg-muted">
          {error instanceof Error ? error.message : 'Failed to load containers'}
        </div>
      ) : !data.available ? (
        <ContainersUnavailable reason={data.reason} />
      ) : (
        <ContainersSummary data={data} />
      )}
    </Card>
  );
}
