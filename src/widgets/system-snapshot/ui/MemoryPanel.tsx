import { Card, Sparkline, StatField, UsageBar } from '@shared/ui';
import { formatBytes, formatPercent, type SystemMemory } from '@entities/system';
import { PanelTitle } from './PanelTitle';

export type MemoryPanelProps = {
  memory: SystemMemory;
  sampledAt: string;
};

export function MemoryPanel({ memory, sampledAt }: MemoryPanelProps) {
  const { virtual: v, swap } = memory;
  const hasSwap = swap.total_bytes > 0;

  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle title="Memory" subtitle={'// virtual + swap'} />

      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            virtual
          </span>
          <span className="font-mono text-xs tabular-nums text-fg-primary">
            {formatBytes(v.used_bytes)} / {formatBytes(v.total_bytes)}
          </span>
        </div>
        <div className="mt-2">
          <UsageBar percent={v.used_percent} />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between font-mono text-[10px] text-fg-muted">
          <span>{formatPercent(v.used_percent, 1)} used</span>
          <span>{formatBytes(v.available_bytes)} available</span>
        </div>
        <div className="mt-3">
          <Sparkline value={v.used_percent} sampledAt={sampledAt} max={100} height={32} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
        <StatField label="free" value={formatBytes(v.free_bytes)} mono />
        <StatField label="available" value={formatBytes(v.available_bytes)} mono />
        {v.cached_bytes > 0 ? (
          <StatField label="cached" value={formatBytes(v.cached_bytes)} mono />
        ) : null}
        {v.buffers_bytes > 0 ? (
          <StatField label="buffers" value={formatBytes(v.buffers_bytes)} mono />
        ) : null}
        {v.shared_bytes > 0 ? (
          <StatField label="shared" value={formatBytes(v.shared_bytes)} mono />
        ) : null}
        {v.slab_bytes > 0 ? (
          <StatField label="slab" value={formatBytes(v.slab_bytes)} mono />
        ) : null}
      </div>

      {hasSwap ? (
        <div className="border-t border-border-subtle pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              swap
            </span>
            <span className="font-mono text-xs tabular-nums text-fg-primary">
              {formatBytes(swap.used_bytes)} / {formatBytes(swap.total_bytes)}
            </span>
          </div>
          <div className="mt-2">
            <UsageBar percent={swap.used_percent} warnThreshold={25} criticalThreshold={50} />
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-fg-muted">
            {formatPercent(swap.used_percent, 1)} used
          </p>
        </div>
      ) : (
        <div className="border-t border-border-subtle pt-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            swap — disabled
          </p>
        </div>
      )}
    </Card>
  );
}
