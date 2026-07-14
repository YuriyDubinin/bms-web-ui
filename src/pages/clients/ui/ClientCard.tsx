import { Pencil, Tags, Trash2 } from 'lucide-react';
import { Card, Chip, IconButton, Tooltip } from '@shared/ui';
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONES,
  clientDisplayName,
  clientInitials,
  type Client,
} from '@entities/client';

export type ClientCardProps = {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onExtras: (client: Client) => void;
};

export function ClientCard({ client, onEdit, onDelete, onExtras }: ClientCardProps) {
  return (
    <Card className="flex h-full flex-col gap-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-2 text-[11px] font-medium text-fg-primary">
            {clientInitials(client) || '·'}
          </span>
          <span className="truncate text-sm font-semibold text-fg-primary" title={clientDisplayName(client)}>
            {clientDisplayName(client)}
          </span>
        </div>
        <Chip tone={CLIENT_STATUS_TONES[client.status]} mono>
          {CLIENT_STATUS_LABELS[client.status]}
        </Chip>
      </div>

      <div className="flex flex-col gap-0.5 text-xs">
        {client.email ? <span className="font-mono text-fg-secondary">{client.email}</span> : null}
        {client.phone ? <span className="font-mono text-fg-secondary">{client.phone}</span> : null}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="truncate font-mono text-[11px] text-fg-muted">{client.source || '—'}</span>
        <div className="flex items-center gap-1">
          <Tooltip content="Tags & links">
            <IconButton aria-label="Tags and links" size="sm" onClick={() => onExtras(client)}>
              <Tags size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Edit">
            <IconButton aria-label="Edit client" size="sm" onClick={() => onEdit(client)}>
              <Pencil size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete">
            <IconButton aria-label="Delete client" size="sm" onClick={() => onDelete(client)}>
              <Trash2 size={13} aria-hidden />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
