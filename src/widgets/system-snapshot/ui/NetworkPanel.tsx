import { useRef } from 'react';
import { Card, Chip, Sparkline, StatField } from '@shared/ui';
import {
  formatBytes,
  formatBytesPerSecond,
  formatCount,
  type SystemNetwork,
} from '@entities/system';
import { PanelTitle } from './PanelTitle';

export type NetworkPanelProps = {
  network: SystemNetwork;
  sampledAt: string;
};

type Snapshot = {
  sampledAt: string;
  byName: Record<string, { sent: number; recv: number }>;
};

type NetRates = {
  perIface: Record<string, { sentRate: number; recvRate: number }>;
  totalRecvRate: number;
  totalSentRate: number;
};

const EMPTY_RATES: NetRates = { perIface: {}, totalRecvRate: 0, totalSentRate: 0 };

function useNetRates(network: SystemNetwork, sampledAt: string): NetRates {
  const prevRef = useRef<Snapshot | null>(null);
  // Кэшируем результат: пересчитываем только при новом снимке (сменился sampledAt),
  // иначе повторные рендеры (StrictMode / соседние стора) обнуляли бы дельту (dt=0).
  const resultRef = useRef<NetRates>(EMPTY_RATES);
  const lastSampledRef = useRef<string | null>(null);

  if (lastSampledRef.current !== sampledAt) {
    const perIface: Record<string, { sentRate: number; recvRate: number }> = {};
    let totalRecvRate = 0;
    let totalSentRate = 0;

    const prev = prevRef.current;
    const dtSec = prev ? (new Date(sampledAt).getTime() - new Date(prev.sampledAt).getTime()) / 1000 : 0;

    for (const c of network.io_counters) {
      const p = prev?.byName[c.name];
      const entry =
        p && dtSec > 0
          ? {
              sentRate: Math.max(0, c.bytes_sent - p.sent) / dtSec,
              recvRate: Math.max(0, c.bytes_recv - p.recv) / dtSec,
            }
          : { sentRate: 0, recvRate: 0 };
      perIface[c.name] = entry;
      // Loopback не учитываем в агрегатной пропускной способности — это внутренний трафик.
      const isLoopback = c.name === 'lo' || c.name.startsWith('lo');
      if (!isLoopback) {
        totalRecvRate += entry.recvRate;
        totalSentRate += entry.sentRate;
      }
    }

    prevRef.current = {
      sampledAt,
      byName: Object.fromEntries(
        network.io_counters.map((c) => [c.name, { sent: c.bytes_sent, recv: c.bytes_recv }]),
      ),
    };
    resultRef.current = { perIface, totalRecvRate, totalSentRate };
    lastSampledRef.current = sampledAt;
  }

  return resultRef.current;
}

export function NetworkPanel({ network, sampledAt }: NetworkPanelProps) {
  const { perIface, totalRecvRate, totalSentRate } = useNetRates(network, sampledAt);
  const totalThroughput = totalRecvRate + totalSentRate;

  // Сначала «up», потом «down»; loopback — в конец.
  const sorted = [...network.interfaces].sort((a, b) => {
    const aUp = a.flags.includes('up') || a.flags.includes('running');
    const bUp = b.flags.includes('up') || b.flags.includes('running');
    if (aUp !== bUp) return aUp ? -1 : 1;
    const aLo = a.name === 'lo' || a.name.startsWith('lo');
    const bLo = b.name === 'lo' || b.name.startsWith('lo');
    if (aLo !== bLo) return aLo ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="flex flex-col gap-3">
      <PanelTitle
        title="Network"
        subtitle={`// ${network.interfaces.length} iface · ${formatCount(network.connections_count, true)} conn`}
      />

      {/* Throughput: агрегатная пропускная способность + sparkline тренда */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            throughput
          </span>
          <span className="flex items-baseline gap-3 font-mono text-xs tabular-nums text-fg-primary">
            <span>↓ {formatBytesPerSecond(totalRecvRate)}</span>
            <span>↑ {formatBytesPerSecond(totalSentRate)}</span>
          </span>
        </div>
        <div className="mt-2">
          <Sparkline
            value={totalThroughput}
            sampledAt={sampledAt}
            height={40}
            strokeClassName="text-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
        <StatField
          label="connections"
          value={formatCount(network.connections_count, true)}
          mono
        />
        <StatField label="interfaces" value={network.interfaces.length} mono />
      </div>

      {/*
        Список интерфейсов: при большом количестве (>~4 рядов) ограничиваем
        высоту и включаем скролл — иначе панель растягивается и ломает
        двухколоночную раскладку Disks/Network в виде «равной высоты».
      */}
      <ul className="max-h-[260px] divide-y divide-border-subtle overflow-y-auto border-t border-border-subtle pr-1">
        {sorted.map((iface) => {
          const isUp = iface.flags.includes('up') || iface.flags.includes('running');
          const counter = network.io_counters.find((c) => c.name === iface.name);
          const rate = perIface[iface.name];
          const ipv4 = iface.addresses.find((a) => a.family === 'ipv4');
          return (
            <li key={iface.name} className="py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate font-mono text-xs text-fg-primary">{iface.name}</span>
                  <Chip tone={isUp ? 'success' : 'neutral'} mono>
                    {isUp ? 'UP' : 'DOWN'}
                  </Chip>
                  {ipv4 ? (
                    <span className="truncate font-mono text-[10px] text-fg-muted">
                      {ipv4.addr}
                    </span>
                  ) : null}
                </div>
                {rate ? (
                  <div className="flex items-baseline gap-3 font-mono text-[10px] tabular-nums text-fg-muted">
                    <span>↓ {formatBytesPerSecond(rate.recvRate)}</span>
                    <span>↑ {formatBytesPerSecond(rate.sentRate)}</span>
                  </div>
                ) : null}
              </div>
              {counter ? (
                <div className="mt-1 flex items-baseline gap-3 font-mono text-[10px] text-fg-muted">
                  <span>recv {formatBytes(counter.bytes_recv)}</span>
                  <span>sent {formatBytes(counter.bytes_sent)}</span>
                  {counter.err_in + counter.err_out > 0 ? (
                    <span className="text-state-warning">
                      errors {counter.err_in + counter.err_out}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
