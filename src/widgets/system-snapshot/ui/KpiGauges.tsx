import { Card, Sparkline, UsageBar } from '@shared/ui';
import { cn } from '@shared/lib';
import {
  formatPercent,
  type SystemCpu,
  type SystemDbPool,
  type SystemDisks,
  type SystemMemory,
} from '@entities/system';

export type KpiGaugesProps = {
  cpu: SystemCpu;
  memory: SystemMemory;
  disks: SystemDisks;
  /**
   * Опциональный четвёртый Gauge — пул подключений к БД приложения.
   * На удалённых серверах не передаётся, и сетка автоматически сжимается до 3 колонок.
   */
  dbPool?: SystemDbPool;
  sampledAt: string;
};

type GaugeProps = {
  label: string;
  caption: string;
  value: number;
  sampledAt: string;
};

function valueClass(percent: number): string {
  if (percent >= 90) return 'text-state-error';
  if (percent >= 75) return 'text-state-warning';
  return 'text-fg-primary';
}

function Gauge({ label, caption, value, sampledAt }: GaugeProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {caption}
        </span>
      </div>
      <div className={cn('mt-2 font-mono text-3xl tabular-nums', valueClass(value))}>
        {formatPercent(value, 1)}
      </div>
      <div className="mt-2">
        <UsageBar percent={value} size="sm" />
      </div>
      <div className="mt-2">
        <Sparkline value={value} sampledAt={sampledAt} max={100} height={28} />
      </div>
    </Card>
  );
}

export function KpiGauges({ cpu, memory, disks, dbPool, sampledAt }: KpiGaugesProps) {
  // Headline-метрика диска — из надёжного disks.usage; fallback на корневую партицию.
  const usage = disks.usage;
  const rootPartition = disks.partitions.find((p) => p.mountpoint === '/') ?? disks.partitions[0];
  const diskPercent = usage?.used_percent ?? rootPartition?.used_percent ?? 0;
  const diskCaption = usage?.path ?? rootPartition?.mountpoint ?? '—';

  const dbUtilization =
    dbPool && dbPool.max_conns > 0 ? (dbPool.acquired_conns / dbPool.max_conns) * 100 : 0;

  return (
    <section
      aria-label="Live KPIs"
      className={cn(
        'grid gap-3 sm:grid-cols-2',
        dbPool ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
      )}
    >
      <Gauge
        label="CPU"
        caption={`${cpu.logical_cores} cores`}
        value={cpu.usage_percent}
        sampledAt={sampledAt}
      />
      <Gauge
        label="Memory"
        caption="virtual"
        value={memory.virtual.used_percent}
        sampledAt={sampledAt}
      />
      <Gauge label="Disk" caption={diskCaption} value={diskPercent} sampledAt={sampledAt} />
      {dbPool ? (
        <Gauge
          label="DB pool"
          caption={`${dbPool.acquired_conns}/${dbPool.max_conns}`}
          value={dbUtilization}
          sampledAt={sampledAt}
        />
      ) : null}
    </section>
  );
}
