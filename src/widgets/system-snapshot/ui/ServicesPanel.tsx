import { useRef } from 'react';
import { Cog } from 'lucide-react';
import { Card, Chip, Skeleton, Sparkline, StatField } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatBytes, formatCount, formatPercent } from '@entities/system';
import {
  hasMemoryAccounting,
  servicesEnabledCount,
  servicesTotalCpuNsec,
  servicesTotalMemoryBytes,
  servicesTotalTasks,
  summarizeServices,
  type ServiceStateSummary,
  type ServicesSnapshot,
} from '@entities/services';
import { PanelTitle } from './PanelTitle';

export type ServicesPanelProps = {
  /** Снапшот сервисов. Для remote синтезируется `select`-функцией в хуке. */
  data: ServicesSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
};

type Segment = {
  key: keyof Omit<ServiceStateSummary, 'total'>;
  label: string;
  barClass: string;
  dotClass: string;
};

const SEGMENTS: Segment[] = [
  { key: 'active', label: 'active', barClass: 'bg-state-success', dotClass: 'bg-state-success' },
  { key: 'failed', label: 'failed', barClass: 'bg-state-error', dotClass: 'bg-state-error' },
  { key: 'activating', label: 'activating', barClass: 'bg-state-info', dotClass: 'bg-state-info' },
  {
    key: 'deactivating',
    label: 'deactivating',
    barClass: 'bg-state-warning',
    dotClass: 'bg-state-warning',
  },
  { key: 'inactive', label: 'inactive', barClass: 'bg-fg-muted', dotClass: 'bg-fg-muted' },
];

/**
 * Агрегатная CPU-нагрузка сервисов: дельта суммарного cpu_usage_nsec между опросами,
 * делённая на интервал. 100% = одно ядро; сумма по всем сервисам может быть > 100%.
 */
function useServicesCpuLoad(snap: ServicesSnapshot): number {
  const prevRef = useRef<{ at: string; nsec: number } | null>(null);
  // Запоминаем последнее посчитанное значение — чтобы «несвежие» рендеры
  // (например, от поллинга соседнего system-запроса) не сбрасывали его в 0.
  const resultRef = useRef(0);
  const totalNsec = servicesTotalCpuNsec(snap);
  const prev = prevRef.current;

  // Пересчитываем только при действительно новом снимке (сменился collected_at).
  if (!prev || prev.at !== snap.collected_at) {
    if (prev) {
      const dtNs = (new Date(snap.collected_at).getTime() - new Date(prev.at).getTime()) * 1e6;
      const dNsec = totalNsec - prev.nsec;
      if (dtNs > 0 && dNsec >= 0) resultRef.current = (dNsec / dtNs) * 100;
    }
    prevRef.current = { at: snap.collected_at, nsec: totalNsec };
  }
  return resultRef.current;
}

function StateBar({ summary }: { summary: ServiceStateSummary }) {
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

function ServicesUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Cog size={20} aria-hidden className="text-fg-muted" />
      <p className="font-mono text-xs text-fg-muted">systemd unavailable</p>
      {reason ? (
        <p className="max-w-md break-words font-mono text-[10px] leading-relaxed text-fg-muted/80">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

function ServicesSummary({ data }: { data: ServicesSnapshot }) {
  const summary = summarizeServices(data);
  const cpuLoad = useServicesCpuLoad(data);
  const totalMem = servicesTotalMemoryBytes(data);
  const memTracked = hasMemoryAccounting(data);
  const totalTasks = servicesTotalTasks(data);
  const enabled = servicesEnabledCount(data);
  const failedUnits = data.manager?.failed_units ?? summary.failed;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Левая часть: суммы + распределение состояний */}
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-4">
          <div>
            <div className="font-mono text-3xl tabular-nums text-fg-primary">{summary.total}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              services
            </div>
          </div>
          <div className="flex items-baseline gap-3 pb-1">
            <span className="font-mono text-sm tabular-nums text-state-success">
              {summary.active} active
            </span>
            <span
              className={cn(
                'font-mono text-sm tabular-nums',
                summary.failed > 0 ? 'text-state-error' : 'text-fg-muted',
              )}
            >
              {summary.failed} failed
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

      {/* Правая часть: тренд CPU-нагрузки + агрегаты ресурсов */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              cpu load (Σ services)
            </span>
            <span className="font-mono text-xs tabular-nums text-fg-primary">
              {formatPercent(cpuLoad, 1)}
            </span>
          </div>
          <div className="mt-2">
            <Sparkline
              value={cpuLoad}
              sampledAt={data.collected_at}
              height={40}
              strokeClassName="text-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
          <StatField
            label="memory Σ"
            value={memTracked ? formatBytes(totalMem) : '—'}
            mono
          />
          <StatField label="tasks Σ" value={totalTasks > 0 ? formatCount(totalTasks) : '—'} mono />
          <StatField
            label="failed units"
            value={failedUnits}
            mono
            valueClassName={failedUnits > 0 ? 'text-state-error' : undefined}
          />
          <StatField label="enabled" value={formatCount(enabled)} mono />
        </div>
      </div>
    </div>
  );
}

function ServicesLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/**
 * Презентационная панель Services. Источник данных — внешний хук:
 *  - Core/Main → useServicesQuery() (локальный /api/system/services);
 *  - Server/Main → useRemoteServicesQuery(serverId) (удалённый, с `select`,
 *    который синтезирует unavailable-снимок при SSH-провале).
 */
export function ServicesPanel({ data, isLoading, error }: ServicesPanelProps) {
  const managerVersion =
    data?.available && data.manager ? `systemd ${data.manager.version}` : null;

  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle
        title="Services"
        subtitle={'// systemd'}
        actions={
          data ? (
            <Chip tone={data.available ? 'success' : 'error'} mono>
              {data.available ? (managerVersion ?? 'AVAILABLE') : 'UNAVAILABLE'}
            </Chip>
          ) : undefined
        }
      />

      {isLoading && !data ? (
        <ServicesLoading />
      ) : !data ? (
        <div className="py-8 text-center font-mono text-xs text-fg-muted">
          {error instanceof Error ? error.message : 'Failed to load services'}
        </div>
      ) : !data.available ? (
        <ServicesUnavailable reason={data.reason} />
      ) : (
        <ServicesSummary data={data} />
      )}
    </Card>
  );
}
