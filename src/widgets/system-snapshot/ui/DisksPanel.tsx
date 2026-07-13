import { useRef } from 'react';
import { Card, Chip, StatField, UsageBar } from '@shared/ui';
import {
  formatBytes,
  formatBytesPerSecond,
  formatCount,
  formatPercent,
  type SystemDisks,
} from '@entities/system';
import { PanelTitle } from './PanelTitle';

export type DisksPanelProps = {
  disks: SystemDisks;
  sampledAt: string;
};

type RateSnapshot = {
  sampledAt: string;
  byDevice: Record<string, { readBytes: number; writeBytes: number }>;
};

type IoRates = Record<string, { readRate: number; writeRate: number }>;

function useIoRates(disks: SystemDisks, sampledAt: string): IoRates {
  const prevRef = useRef<RateSnapshot | null>(null);
  // Кэшируем результат: пересчёт только при новом снимке (сменился sampledAt),
  // иначе повторные рендеры обнуляли бы дельту (dt=0).
  const resultRef = useRef<IoRates>({});
  const lastSampledRef = useRef<string | null>(null);

  if (disks.io_counters && lastSampledRef.current !== sampledAt) {
    const rates: IoRates = {};
    const prev = prevRef.current;
    const dtSec =
      prev && prev.sampledAt
        ? (new Date(sampledAt).getTime() - new Date(prev.sampledAt).getTime()) / 1000
        : 0;

    for (const [device, c] of Object.entries(disks.io_counters)) {
      const prevDev = prev?.byDevice[device];
      if (prevDev && dtSec > 0) {
        const dr = Math.max(0, c.read_bytes - prevDev.readBytes);
        const dw = Math.max(0, c.write_bytes - prevDev.writeBytes);
        rates[device] = { readRate: dr / dtSec, writeRate: dw / dtSec };
      } else {
        rates[device] = { readRate: 0, writeRate: 0 };
      }
    }

    prevRef.current = {
      sampledAt,
      byDevice: Object.fromEntries(
        Object.entries(disks.io_counters).map(([dev, c]) => [
          dev,
          { readBytes: c.read_bytes, writeBytes: c.write_bytes },
        ]),
      ),
    };
    resultRef.current = rates;
    lastSampledRef.current = sampledAt;
  }

  return resultRef.current;
}

export function DisksPanel({ disks, sampledAt }: DisksPanelProps) {
  const rates = useIoRates(disks, sampledAt);
  const usage = disks.usage;
  // disks.usage.total_bytes === 0 → данные не собрались, показываем «—».
  const hasUsage = !!usage && usage.total_bytes > 0;

  // Сортируем партиции: корень первым, дальше — по убыванию used_percent.
  const sorted = [...disks.partitions].sort((a, b) => {
    if (a.mountpoint === '/') return -1;
    if (b.mountpoint === '/') return 1;
    return b.used_percent - a.used_percent;
  });

  return (
    <Card className="flex flex-col gap-3">
      <PanelTitle
        title="Disks"
        subtitle={`// ${disks.partitions.length} partition${disks.partitions.length === 1 ? '' : 's'}`}
        actions={
          hasUsage ? (
            <Chip tone="neutral" mono>
              {usage.fstype || '—'}
            </Chip>
          ) : undefined
        }
      />

      {/* Headline: сводка по физическому диску из disks.usage */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {hasUsage ? usage.path : 'physical'}
          </span>
          <span className="font-mono text-xs tabular-nums text-fg-primary">
            {hasUsage ? (
              <>
                {formatBytes(usage.used_bytes)} / {formatBytes(usage.total_bytes)}
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
        <div className="mt-2">
          <UsageBar percent={hasUsage ? usage.used_percent : 0} />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between font-mono text-[10px] text-fg-muted">
          <span>{hasUsage ? `${formatPercent(usage.used_percent, 1)} used` : '—'}</span>
          <span>{hasUsage ? `${formatBytes(usage.free_bytes)} free` : ''}</span>
        </div>
        {hasUsage ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatField label="inodes used" value={formatCount(usage.inodes_used, true)} mono />
            <StatField label="inodes free" value={formatCount(usage.inodes_free, true)} mono />
          </div>
        ) : null}
      </div>

      {/* Партиции */}
      {sorted.length > 0 ? (
        <ul className="divide-y divide-border-subtle border-t border-border-subtle">
          {sorted.map((p) => {
            const ioKey = p.device.replace(/^\/dev\//, '');
            const rate = rates[ioKey] ?? rates[p.device];
            return (
              <li key={p.device + p.mountpoint} className="py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate font-mono text-xs text-fg-primary">
                      {p.mountpoint}
                    </span>
                    <Chip tone="neutral" mono>
                      {p.fstype || '—'}
                    </Chip>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-fg-secondary">
                    {formatBytes(p.used_bytes)} / {formatBytes(p.total_bytes)}{' '}
                    <span className="text-fg-muted">· {formatPercent(p.used_percent, 1)}</span>
                  </span>
                </div>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-fg-muted">
                  {p.device}
                </span>
                <div className="mt-1.5">
                  <UsageBar percent={p.used_percent} size="sm" />
                </div>
                {rate ? (
                  // Рендерим всегда (даже при 0 B/s) — иначе строка появляется/исчезает и высота прыгает.
                  <div className="mt-1.5 flex items-baseline gap-3 font-mono text-[10px] text-fg-muted">
                    <span>read {formatBytesPerSecond(rate.readRate)}</span>
                    <span>write {formatBytesPerSecond(rate.writeRate)}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
