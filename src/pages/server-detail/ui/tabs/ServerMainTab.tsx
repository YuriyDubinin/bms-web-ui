import { useEffect, useState } from 'react';
import { AlertTriangle, Boxes, Cpu, Globe, PlugZap, RefreshCw, ServerOff } from 'lucide-react';
import { ApiError } from '@shared/api';
import { Button, Card, Chip, Country, FadeIn } from '@shared/ui';
import { cn } from '@shared/lib';
import {
  formatUptime,
  useRemoteSystemQuery,
  type RemoteSystemResult,
  type RemoteSystemSnapshot,
  type SystemDocker,
  type SystemHost,
} from '@entities/system';
import { useRemoteContainersQuery } from '@entities/containers';
import { useRemoteServicesQuery } from '@entities/services';
import {
  ServerEnvironmentBadge,
  ServerProtocolBadge,
  type Server,
} from '@entities/server';
import { ServerSshKeyIndicator } from '@features/manage-server';
import {
  ContainersPanel,
  CpuPanel,
  DisksPanel,
  ErrorsBanner,
  KpiGauges,
  LiveIndicator,
  MemoryPanel,
  NetworkPanel,
  ServicesPanel,
  SystemSnapshotSkeleton,
} from '@widgets/system-snapshot';

export type ServerMainTabProps = {
  server: Server;
};

const POLL_INTERVAL_MS = 3000;

// ---------- Локальные визуальные капсулы (стиль = Core/SummaryStrip) ----------

/** Анимированная точка статуса соединения — аналог HealthPulse из Core. */
function ConnectionPulse({ connected }: { connected: boolean }) {
  const tone = connected ? 'text-state-success' : 'text-state-error';
  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', tone)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
    </span>
  );
}

function OsBadge({ host }: { host: SystemHost }) {
  const platform = host.platform || host.os;
  const platformLabel = platform
    ? platform.charAt(0).toUpperCase() + platform.slice(1)
    : 'Unknown';
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-1">
      <Cpu size={13} aria-hidden className="text-fg-secondary" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">OS</span>
      <span className="text-xs text-fg-primary">{platformLabel}</span>
      {host.platform_version ? (
        <span className="font-mono text-[11px] text-fg-muted">{host.platform_version}</span>
      ) : null}
      <span className="text-fg-muted/50">/</span>
      <span className="font-mono text-[11px] text-fg-muted">{host.kernel_arch || '—'}</span>
    </span>
  );
}

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

function DockerBadge({ docker }: { docker?: SystemDocker }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-2 px-2.5 py-1">
      <Boxes size={13} aria-hidden className="text-state-info" />
      <span className="inline-flex items-baseline gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">engine</span>
        <span className="font-mono text-xs text-fg-primary">{docker?.engine || '—'}</span>
      </span>
      <span className="text-fg-muted/50">·</span>
      <span className="inline-flex items-baseline gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">compose</span>
        <span className="font-mono text-xs text-fg-primary">{docker?.compose || '—'}</span>
      </span>
    </span>
  );
}

function UptimeBadge({ seconds }: { seconds: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-xs text-fg-secondary">
      <span className="text-[10px] uppercase tracking-wider text-fg-muted">uptime</span>
      <span>{formatUptime(seconds)}</span>
    </span>
  );
}

/** Тикающий аптайм между обновлениями: сбрасывается на каждый новый снапшот. */
function useTickingUptime(initialSeconds: number, anchor: string): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(0);
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [anchor]);
  return Math.floor(initialSeconds + tick);
}

// ---------- Верхняя статус-панель (структура = Core/SummaryStrip) ----------

type SummaryStripProps = {
  server: Server;
  snapshot: RemoteSystemSnapshot;
  status: string;
  fetching: boolean;
};

function RemoteSummaryStrip({ server, snapshot, status, fetching }: SummaryStripProps) {
  const liveUptime = useTickingUptime(snapshot.host.uptime_seconds, snapshot.collected_at);

  return (
    <section
      aria-label="Remote system status"
      className="rounded-md border border-border-subtle bg-bg-1 px-4 py-3"
    >
      {/* Верхняя строка: статус + идентичность сервера. SSH-индикатор — в правом верхнем углу. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex items-center gap-2">
            <ConnectionPulse connected />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-state-success">
              {status}
            </span>
          </span>

          <span className="text-fg-muted/50">·</span>

          <span className="inline-flex items-baseline gap-2">
            <span className="text-sm font-semibold text-fg-primary">{server.name}</span>
            <span
              className="truncate font-mono text-xs text-fg-muted"
              title={`${server.host}:${server.port}`}
            >
              {server.host}:{server.port}
            </span>
            <ServerEnvironmentBadge environment={server.environment} />
          </span>
        </div>

        <ServerSshKeyIndicator server={server} />
      </div>

      {/* Нижняя строка: OS / GEO / IP / uptime / Docker · LIVE. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-border-subtle pt-3">
        <OsBadge host={snapshot.host} />
        <CountryBadge host={snapshot.host} />
        <IpBadge host={snapshot.host} />
        <UptimeBadge seconds={liveUptime} />
        <DockerBadge docker={snapshot.docker} />
        <div className="ml-auto">
          <LiveIndicator fetching={fetching} intervalMs={POLL_INTERVAL_MS} />
        </div>
      </div>
    </section>
  );
}

// ---------- Состояния «не успех» ----------

function FailureCard({
  server,
  result,
  fetching,
  onRetry,
}: {
  server: Server;
  result: RemoteSystemResult;
  fetching: boolean;
  onRetry: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ServerOff size={26} aria-hidden className="text-state-error" />
        <p className="text-sm font-medium text-fg-primary">Could not reach the server</p>
        <p className="max-w-md font-mono text-xs text-fg-muted">
          {server.host}:{server.port}
        </p>
        <Chip tone="error" mono>
          {result.status}
        </Chip>
        <p className="max-w-md font-mono text-xs text-fg-secondary">{result.message}</p>
        <Button
          className="mt-2"
          leftIcon={<RefreshCw size={13} aria-hidden className={fetching ? 'animate-spin' : ''} />}
          loading={fetching}
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    </Card>
  );
}

function HttpErrorCard({
  error,
  fetching,
  onRetry,
}: {
  error: Error | null;
  fetching: boolean;
  onRetry: () => void;
}) {
  const message =
    error instanceof ApiError
      ? `${error.code} · ${error.message}`
      : error?.message || 'Unknown error';
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle size={22} aria-hidden className="text-state-warning" />
        <p className="text-sm text-fg-primary">Remote snapshot request failed</p>
        <p className="max-w-md font-mono text-xs text-fg-muted">{message}</p>
        <Button
          className="mt-2"
          variant="secondary"
          leftIcon={<RefreshCw size={13} aria-hidden className={fetching ? 'animate-spin' : ''} />}
          loading={fetching}
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    </Card>
  );
}

/** Урезанная шапка для состояний «нет данных» — показывает идентичность сервера и Retry. */
function SimpleHeader({
  server,
  status,
  fetching,
  onRefresh,
}: {
  server: Server;
  status: string;
  fetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <section
      aria-label="Remote system status"
      className="rounded-md border border-border-subtle bg-bg-1 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex items-center gap-2">
            <ConnectionPulse connected={false} />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-state-error">
              {status}
            </span>
          </span>
          <span className="text-fg-muted/50">·</span>
          <span className="text-sm font-semibold text-fg-primary">{server.name}</span>
          <span
            className="truncate font-mono text-xs text-fg-muted"
            title={`${server.host}:${server.port}`}
          >
            {server.host}:{server.port}
          </span>
          <ServerEnvironmentBadge environment={server.environment} />
          <ServerProtocolBadge protocol={server.protocol} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<PlugZap size={13} aria-hidden />}
          loading={fetching}
          onClick={onRefresh}
        >
          Retry connect
        </Button>
      </div>
    </section>
  );
}

// ---------- Корневая вкладка ----------

export function ServerMainTab({ server }: ServerMainTabProps) {
  const { data, error, isLoading, isFetching, refetch } = useRemoteSystemQuery(server.id);
  // Контейнеры и сервисы — отдельными запросами, но включаем их **только при удачном
  // главном коннекте**: смысла бомбардировать SSH-сессиями недоступный сервер нет.
  const ssh = !!data?.connected;
  const containersQ = useRemoteContainersQuery(server.id, ssh);
  const servicesQ = useRemoteServicesQuery(server.id, ssh);

  // Первая загрузка — каркас.
  if (isLoading && !data) {
    return <SystemSnapshotSkeleton />;
  }

  // HTTP-ошибка (404 / 422 / 500 / network) — нет тела.
  if (!data) {
    return (
      <FadeIn distance={4}>
        <SimpleHeader
          server={server}
          status="UNAVAILABLE"
          fetching={isFetching}
          onRefresh={() => refetch()}
        />
        <div className="mt-4">
          <HttpErrorCard error={error} fetching={isFetching} onRetry={() => refetch()} />
        </div>
      </FadeIn>
    );
  }

  // 200 OK, но коннект не удался (AUTH_FAILED / UNREACHABLE / TIMEOUT / ERROR).
  if (!data.connected || !data.system) {
    return (
      <FadeIn distance={4}>
        <SimpleHeader
          server={server}
          status={data.status}
          fetching={isFetching}
          onRefresh={() => refetch()}
        />
        <div className="mt-4">
          <FailureCard
            server={server}
            result={data}
            fetching={isFetching}
            onRetry={() => refetch()}
          />
        </div>
      </FadeIn>
    );
  }

  // Успех — полный снапшот.
  const snap = data.system;
  const sampledAt = snap.collected_at;

  return (
    <FadeIn distance={4}>
      <div className="space-y-4">
        <RemoteSummaryStrip
          server={server}
          snapshot={snap}
          status={data.status}
          fetching={isFetching}
        />

        <KpiGauges
          cpu={snap.cpu}
          memory={snap.memory}
          disks={snap.disks}
          sampledAt={sampledAt}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <CpuPanel cpu={snap.cpu} sampledAt={sampledAt} />
          <MemoryPanel memory={snap.memory} sampledAt={sampledAt} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <DisksPanel disks={snap.disks} sampledAt={sampledAt} />
          <NetworkPanel network={snap.network} sampledAt={sampledAt} />
        </div>

        <ContainersPanel
          data={containersQ.data}
          isLoading={containersQ.isLoading}
          error={containersQ.error}
        />

        <ServicesPanel
          data={servicesQ.data}
          isLoading={servicesQ.isLoading}
          error={servicesQ.error}
        />

        {snap.errors && snap.errors.length > 0 ? <ErrorsBanner errors={snap.errors} /> : null}
      </div>
    </FadeIn>
  );
}
