import { Card, StatField } from '@shared/ui';
import {
  formatBytes,
  formatPercent,
  formatUptime,
  type SystemProcess,
} from '@entities/system';
import { PanelTitle } from '@widgets/system-snapshot';

export type ProcessPanelProps = {
  process: SystemProcess;
};

export function ProcessPanel({ process }: ProcessPanelProps) {
  return (
    <Card className="flex flex-col gap-3">
      <PanelTitle title="Process" subtitle={'// host-level view'} />

      <div className="grid grid-cols-3 gap-3">
        <StatField label="pid" value={process.pid || '—'} mono />
        <StatField label="ppid" value={process.ppid || '—'} mono />
        <StatField label="user" value={process.username || '—'} mono />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatField label="cpu" value={formatPercent(process.cpu_percent, 1)} mono />
        <StatField label="mem%" value={formatPercent(process.memory_percent, 2)} mono />
        <StatField label="uptime" value={formatUptime(process.uptime_seconds)} mono />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatField label="rss" value={formatBytes(process.memory_rss_bytes)} mono />
        <StatField label="vms" value={formatBytes(process.memory_vms_bytes)} mono />
        <StatField label="threads" value={process.num_threads} mono />
        <StatField label="fds" value={process.num_fds || '—'} mono />
      </div>

      <div className="space-y-1 border-t border-border-subtle pt-3">
        {process.exe ? (
          <p className="font-mono text-[11px] text-fg-secondary">
            <span className="text-fg-muted">exe </span>
            {process.exe}
          </p>
        ) : null}
        {process.cmdline ? (
          <p className="break-all font-mono text-[11px] text-fg-secondary">
            <span className="text-fg-muted">cmd </span>
            {process.cmdline}
          </p>
        ) : null}
        {process.cwd ? (
          <p className="font-mono text-[11px] text-fg-secondary">
            <span className="text-fg-muted">cwd </span>
            {process.cwd}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
