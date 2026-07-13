import { useEffect, useState } from 'react';
import { Boxes, Cpu, Globe } from 'lucide-react';
import { Chip, Country } from '@shared/ui';
import { cn } from '@shared/lib';
import {
  deriveHealth,
  formatUptime,
  healthLabel,
  healthTone,
  type HealthStatus,
  type SystemHost,
  type SystemSnapshot,
} from '@entities/system';
import { SshKeyIndicator } from '@features/manage-ssh-key';
import { LiveIndicator } from '@widgets/system-snapshot';

export type SummaryStripProps = {
  data: SystemSnapshot;
  fetching: boolean;
  pollIntervalMs: number;
};

const TONE_TEXT: Record<'success' | 'warning' | 'error', string> = {
  success: 'text-state-success',
  warning: 'text-state-warning',
  error: 'text-state-error',
};

/**
 * Живой индикатор здоровья: точка с мягким свечением + расходящееся кольцо (animate-ping).
 * Цвет — по health. При prefers-reduced-motion глобальный CSS гасит анимацию.
 */
function HealthPulse({ status }: { status: HealthStatus }) {
  const tone = healthTone(status);
  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', TONE_TEXT[tone])}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
    </span>
  );
}

/** Бейдж ОС: иконка + платформа+версия и архитектура моноширинно. */
function OsBadge({ host }: { host: SystemHost }) {
  const platform = host.platform || host.os;
  const platformLabel = platform
    ? platform.charAt(0).toUpperCase() + platform.slice(1)
    : 'Unknown';
  const version = host.platform_version || '';
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-1">
      <Cpu size={13} aria-hidden className="text-fg-secondary" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">OS</span>
      <span className="text-xs text-fg-primary">{platformLabel}</span>
      {version ? <span className="font-mono text-[11px] text-fg-muted">{version}</span> : null}
      <span className="text-fg-muted/50">/</span>
      <span className="font-mono text-[11px] text-fg-muted">{host.kernel_arch}</span>
    </span>
  );
}

/**
 * Бейдж страны сервера по host.country_code/host.country.
 * Если поля не пришли (приватный IP / нет в базе DB-IP) — показываем «—»,
 * чтобы ряд капсул в панели визуально не «прыгал» между запросами.
 */
function CountryBadge({ host }: { host: SystemHost }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">GEO</span>
      <Country
        code={host.country_code}
        name={host.country}
        size={18}
        variant="name"
        fallback={<span className="font-mono text-xs text-fg-muted">—</span>}
      />
    </span>
  );
}

/** Выделенный блок с IP сервера: публичный (акцент) + внутренний (muted). */
function IpBadge({ host }: { host: SystemHost }) {
  const publicIp = host.public_ip || '—';
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-1">
      <Globe size={13} aria-hidden className="text-accent" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">IP</span>
      <span className="font-mono text-xs text-accent">{publicIp}</span>
      {host.primary_ip ? (
        <>
          <span className="text-fg-muted/50">/</span>
          <span className="font-mono text-[11px] text-fg-muted">{host.primary_ip}</span>
        </>
      ) : null}
    </span>
  );
}

/**
 * Бейдж версий Docker-стека. Показывается всегда: если поле отсутствует
 * (бэк не смог его собрать — например, не примонтирован docker.sock или
 * бинарь compose), вместо версии отображается прочерк.
 */
function DockerBadge({ engine, compose }: { engine?: string; compose?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-1">
      <Boxes size={13} aria-hidden className="text-state-info" />
      <span className="inline-flex items-baseline gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">engine</span>
        <span className="font-mono text-xs text-fg-primary">{engine || '—'}</span>
      </span>
      <span className="text-fg-muted/50">·</span>
      <span className="inline-flex items-baseline gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">compose</span>
        <span className="font-mono text-xs text-fg-primary">{compose || '—'}</span>
      </span>
    </span>
  );
}

/** Аптайм с подписью, моноширинно. */
function UptimeBadge({ seconds }: { seconds: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-xs text-fg-secondary">
      <span className="text-[10px] uppercase tracking-wider text-fg-muted">uptime</span>
      <span>{formatUptime(seconds)}</span>
    </span>
  );
}

/**
 * Локальный «живой» счётчик: тикает между поллингами от app.uptime_seconds.
 * Сбрасывается на каждый новый снапшот.
 */
function useTickingUptime(initialSeconds: number, anchor: string): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(0);
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [anchor]);
  return Math.floor(initialSeconds + tick);
}

export function SummaryStrip({ data, fetching, pollIntervalMs }: SummaryStripProps) {
  const health = deriveHealth(data);
  const tone = healthTone(health.status);
  const liveUptime = useTickingUptime(data.app.uptime_seconds, data.collected_at);
  const { host } = data;
  const docker = data.docker;

  return (
    <section
      aria-label="System status"
      className="rounded-md border border-border-subtle bg-bg-1 px-4 py-3"
    >
      {/* Верхняя строка: статус + идентичность сервиса. SSH-иконка — в правом верхнем углу. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex items-center gap-2">
            <HealthPulse status={health.status} />
            <span
              className={cn(
                'font-mono text-xs font-semibold uppercase tracking-wider',
                TONE_TEXT[tone],
              )}
            >
              {healthLabel(health.status)}
            </span>
          </span>

          <span className="text-fg-muted/50">·</span>

          <span className="inline-flex items-baseline gap-2">
            <span className="text-sm font-semibold text-fg-primary">{data.app.name}</span>
            <span className="font-mono text-xs text-fg-muted">v{data.app.version}</span>
            <Chip tone={data.app.env === 'production' ? 'accent' : 'info'} mono>
              {data.app.env.toUpperCase()}
            </Chip>
          </span>
        </div>

        <SshKeyIndicator />
      </div>

      {/* Нижняя строка: окружение и сеть. Все элементы — выровненные «капсулы». */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-border-subtle pt-3">
        <OsBadge host={host} />
        <CountryBadge host={host} />
        <IpBadge host={host} />
        <UptimeBadge seconds={liveUptime} />
        <DockerBadge engine={docker?.engine} compose={docker?.compose} />
        <div className="ml-auto">
          <LiveIndicator fetching={fetching} intervalMs={pollIntervalMs} />
        </div>
      </div>
    </section>
  );
}
