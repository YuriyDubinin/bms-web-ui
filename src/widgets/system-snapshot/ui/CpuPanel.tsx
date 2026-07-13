import { Card, Sparkline, StatField, Tooltip } from '@shared/ui';
import { cn } from '@shared/lib';
import { formatMhz, formatPercent, type SystemCpu } from '@entities/system';
import { PanelTitle } from './PanelTitle';

export type CpuPanelProps = {
  cpu: SystemCpu;
  sampledAt: string;
};

/** Цвет ячейки heatmap'а — opacity бакетируем, чтобы было ощущение «уровней». */
function heatBucket(percent: number): { opacity: number; tone: 'accent' | 'warning' | 'error' } {
  if (percent >= 90) return { opacity: 1, tone: 'error' };
  if (percent >= 75) return { opacity: 0.9, tone: 'warning' };
  // ниже 75% — акцент с opacity 0.15..0.85
  const clamped = Math.max(0, Math.min(100, percent));
  const opacity = 0.15 + (clamped / 75) * 0.7;
  return { opacity, tone: 'accent' };
}

function loadColor(load: number, cores: number): string {
  if (cores <= 0) return 'text-fg-primary';
  const ratio = load / cores;
  if (ratio >= 2) return 'text-state-error';
  if (ratio >= 1) return 'text-state-warning';
  return 'text-fg-primary';
}

export function CpuPanel({ cpu, sampledAt }: CpuPanelProps) {
  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle title="CPU" subtitle={'// realtime usage'} />

      <StatField
        label="model"
        value={cpu.model_name || '—'}
        mono
        valueClassName="text-xs leading-snug"
      />

      <div className="grid grid-cols-3 gap-3">
        <StatField label="physical" value={cpu.physical_cores || '—'} mono />
        <StatField label="logical" value={cpu.logical_cores || '—'} mono />
        <StatField label="clock" value={formatMhz(cpu.mhz)} mono />
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            usage
          </span>
          <span className="font-mono text-xs tabular-nums text-fg-primary">
            {formatPercent(cpu.usage_percent, 1)}
          </span>
        </div>
        <Sparkline value={cpu.usage_percent} sampledAt={sampledAt} max={100} height={40} />
      </div>

      <div>
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          per-core ({cpu.per_core_usage_percent.length})
        </span>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${Math.min(16, Math.max(4, cpu.per_core_usage_percent.length))}, minmax(0, 1fr))`,
          }}
        >
          {cpu.per_core_usage_percent.map((v, i) => {
            const { opacity, tone } = heatBucket(v);
            const bg =
              tone === 'error'
                ? 'bg-state-error'
                : tone === 'warning'
                  ? 'bg-state-warning'
                  : 'bg-accent';
            return (
              <Tooltip key={i} content={`core ${i}: ${formatPercent(v, 1)}`}>
                <div
                  aria-label={`core ${i} usage ${v.toFixed(1)}%`}
                  className={cn('h-5 w-full rounded-sm border border-border-subtle', bg)}
                  style={{ opacity }}
                />
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border-subtle pt-3">
        <StatField
          label="load 1m"
          value={cpu.load_avg_1.toFixed(2)}
          mono
          valueClassName={loadColor(cpu.load_avg_1, cpu.logical_cores)}
        />
        <StatField label="load 5m" value={cpu.load_avg_5.toFixed(2)} mono />
        <StatField label="load 15m" value={cpu.load_avg_15.toFixed(2)} mono />
      </div>
    </Card>
  );
}
