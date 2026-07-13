import { Pencil, Trash2 } from 'lucide-react';
import { Card, IconButton, Tooltip } from '@shared/ui';
import type { Registry } from '@entities/registry';
import {
  RegistryConnectButton,
  RegistryImagesButton,
  RegistryPingButton,
} from '@features/manage-registry';
import {
  RegistryActiveBadge,
  RegistryCreds,
  RegistryDefaultMark,
  RegistryLastStatus,
  RegistryTypeBadge,
} from './RegistryBits';
import { formatShortDate } from './format';

export type RegistryCardProps = {
  registry: Registry;
  onEdit: (registry: Registry) => void;
  onDelete: (registry: Registry) => void;
};

export function RegistryCard({ registry, onEdit, onDelete }: RegistryCardProps) {
  return (
    <Card className="flex h-full flex-col gap-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg-primary">{registry.name}</span>
          <RegistryDefaultMark isDefault={registry.is_default} />
        </div>
        <RegistryTypeBadge type={registry.type} />
      </div>

      <p className="truncate font-mono text-xs text-fg-secondary" title={registry.url}>
        {registry.url}
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">user</span>
          <span className="truncate font-mono text-fg-secondary">
            {registry.username || 'anonymous'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            namespace
          </span>
          <span className="truncate font-mono text-fg-secondary">{registry.namespace || '—'}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-border-subtle pt-3">
        <RegistryActiveBadge active={registry.is_active} pulse />
        <RegistryLastStatus status={registry.last_status} />
        <RegistryCreds has={registry.has_credentials} />
        <span className="ml-auto font-mono text-[10px] text-fg-muted">
          {formatShortDate(registry.created_at)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-1">
        <RegistryImagesButton registry={registry} />
        <RegistryConnectButton registry={registry} />
        <RegistryPingButton registry={registry} />
        <Tooltip content="Edit">
          <IconButton aria-label="Edit registry" size="sm" onClick={() => onEdit(registry)}>
            <Pencil size={13} aria-hidden />
          </IconButton>
        </Tooltip>
        <Tooltip content="Delete">
          <IconButton aria-label="Delete registry" size="sm" onClick={() => onDelete(registry)}>
            <Trash2 size={13} aria-hidden />
          </IconButton>
        </Tooltip>
      </div>
    </Card>
  );
}
