import { Card, Chip, StatField, UsageBar } from '@shared/ui';
import {
  formatBytes,
  formatCount,
  formatMs,
  type SystemDatabase,
} from '@entities/system';
import { PanelTitle } from '@widgets/system-snapshot';

export type DatabasePanelProps = {
  database: SystemDatabase;
};

export function DatabasePanel({ database }: DatabasePanelProps) {
  const pool = database.pool;
  const utilization = pool.max_conns > 0 ? (pool.acquired_conns / pool.max_conns) * 100 : 0;
  const serverUtil =
    database.server.max_connections > 0
      ? (database.server.active_connections / database.server.max_connections) * 100
      : 0;
  const versionShort = database.version.split(' ').slice(0, 2).join(' ');

  return (
    <Card className="flex flex-col gap-4">
      <PanelTitle
        title="Database"
        subtitle={'// pool · server'}
        actions={
          <Chip tone={database.reachable ? 'success' : 'error'} mono>
            {database.reachable ? 'REACHABLE' : 'UNREACHABLE'}
          </Chip>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatField label="version" value={versionShort || '—'} mono valueClassName="text-xs" />
        <StatField label="ping" value={formatMs(database.ping_latency_ms)} mono />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            pool utilization
          </span>
          <span className="font-mono text-xs tabular-nums text-fg-primary">
            {pool.acquired_conns}/{pool.max_conns}
          </span>
        </div>
        <div className="mt-2">
          <UsageBar percent={utilization} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatField label="total" value={pool.total_conns} mono />
        <StatField label="idle" value={pool.idle_conns} mono />
        <StatField label="acquired" value={pool.acquired_conns} mono />
        <StatField label="constructing" value={pool.constructing_conns} mono />
        <StatField label="empty acq" value={formatCount(pool.empty_acquire_count, true)} mono />
        <StatField label="canceled" value={formatCount(pool.canceled_acquire_count, true)} mono />
      </div>

      <div className="border-t border-border-subtle pt-3">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            server connections
          </span>
          <span className="font-mono text-xs tabular-nums text-fg-primary">
            {database.server.active_connections}/{database.server.max_connections}
          </span>
        </div>
        <div className="mt-2">
          <UsageBar percent={serverUtil} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatField
            label="db name"
            value={database.server.current_database || '—'}
            mono
          />
          <StatField
            label="db size"
            value={formatBytes(database.server.database_size_bytes)}
            mono
          />
        </div>
      </div>
    </Card>
  );
}
