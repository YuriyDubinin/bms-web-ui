import { Pencil, Trash2 } from 'lucide-react';
import { Card, Chip, IconButton, Tooltip } from '@shared/ui';
import {
  ServerConnectButton,
  ServerInstallKeyButton,
  ServerOpenButton,
  ServerPingButton,
} from '@features/manage-server';
import {
  formatBytes,
  formatShortDate,
  ServerActiveBadge,
  ServerAuthMethodLabel,
  ServerCreds,
  ServerEnvironmentBadge,
  ServerLastStatus,
  ServerProtocolBadge,
  ServerSshKeyBadge,
  type Server,
} from '@entities/server';

export type ServerCardProps = {
  server: Server;
  onEdit: (server: Server) => void;
  onDelete: (server: Server) => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{label}</span>
      <span className="truncate font-mono text-fg-secondary" title={value}>
        {value}
      </span>
    </div>
  );
}

export function ServerCard({ server, onEdit, onDelete }: ServerCardProps) {
  const hasFacts =
    !!server.os ||
    !!server.arch ||
    !!server.kernel_version ||
    !!server.remote_hostname ||
    server.cpu_cores != null ||
    server.memory_total_bytes != null ||
    server.disk_total_bytes != null;

  const osLabel = [server.os, server.os_version].filter(Boolean).join(' ') || '—';

  return (
    <Card className="flex h-full flex-col gap-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg-primary" title={server.name}>
            {server.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ServerEnvironmentBadge environment={server.environment} />
          {/* Главное действие — отдельно от нижней строки иконок, акцентной заливкой. */}
          <ServerOpenButton server={server} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="truncate font-mono text-xs text-fg-secondary"
          title={`${server.host}:${server.port}`}
        >
          {server.host}:{server.port}
        </span>
        <ServerProtocolBadge protocol={server.protocol} />
      </div>

      {server.description ? (
        <p className="line-clamp-2 text-xs text-fg-muted" title={server.description}>
          {server.description}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="user" value={server.username || 'anonymous'} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">auth</span>
          <ServerAuthMethodLabel method={server.auth_method} />
        </div>
        <Field label="provider" value={server.provider || '—'} />
        <Field label="location" value={server.location || '—'} />
      </div>

      {/* Факты окружения — только если заполнены (после remote/connect). */}
      {hasFacts ? (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-bg-1 p-2 text-xs">
          <Field label="os" value={osLabel} />
          <Field label="arch" value={server.arch || '—'} />
          <Field label="cpu" value={server.cpu_cores != null ? `${server.cpu_cores} cores` : '—'} />
          <Field label="memory" value={formatBytes(server.memory_total_bytes)} />
          <Field label="disk" value={formatBytes(server.disk_total_bytes)} />
          <Field label="kernel" value={server.kernel_version || '—'} />
        </div>
      ) : null}

      {server.tags && server.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {server.tags.map((tag) => (
            <Chip key={tag} tone="neutral" mono>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border-subtle pt-3">
        <ServerActiveBadge active={server.is_active} pulse />
        <ServerLastStatus status={server.last_status} />
        <ServerCreds hasPassword={server.has_password} hasPrivateKey={server.has_private_key} />
        <ServerSshKeyBadge installed={!!server.ssh_key_installed} />
        <span className="ml-auto font-mono text-[10px] text-fg-muted">
          {formatShortDate(server.created_at)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-1">
        <ServerConnectButton server={server} />
        <ServerPingButton server={server} />
        {/* Install/Reinstall — только если сервер хоть раз успешно «коннектился». */}
        {server.last_status === 'OK' ? <ServerInstallKeyButton server={server} /> : null}
        <Tooltip content="Edit">
          <IconButton aria-label="Edit server" size="sm" onClick={() => onEdit(server)}>
            <Pencil size={13} aria-hidden />
          </IconButton>
        </Tooltip>
        <Tooltip content="Delete">
          <IconButton aria-label="Delete server" size="sm" onClick={() => onDelete(server)}>
            <Trash2 size={13} aria-hidden />
          </IconButton>
        </Tooltip>
      </div>
    </Card>
  );
}
