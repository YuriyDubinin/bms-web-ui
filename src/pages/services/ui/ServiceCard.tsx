import { Pencil, Tags, Trash2 } from 'lucide-react';
import { Card, Chip, IconButton, Tooltip } from '@shared/ui';
import {
  formatDuration,
  formatPrice,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_TONES,
  type Service,
} from '@entities/service';
import type { Project } from '@entities/project';

export type ServiceCardProps = {
  service: Service;
  project?: Project;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onExtras: (service: Service) => void;
};

export function ServiceCard({ service, project, onEdit, onDelete, onExtras }: ServiceCardProps) {
  return (
    <Card className="flex h-full flex-col gap-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-semibold text-fg-primary" title={service.name}>
          {service.name}
        </span>
        <Chip tone={SERVICE_STATUS_TONES[service.status]} mono>
          {SERVICE_STATUS_LABELS[service.status]}
        </Chip>
      </div>

      {service.category ? (
        <span className="font-mono text-xs text-fg-secondary">{service.category}</span>
      ) : null}

      {service.description ? (
        <p className="line-clamp-2 text-xs text-fg-muted" title={service.description}>
          {service.description}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">price</span>
          <span className="font-mono text-fg-secondary">{formatPrice(service.price, service.currency)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">duration</span>
          <span className="font-mono text-fg-secondary">{formatDuration(service.duration_min)}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="truncate font-mono text-[11px] text-fg-muted">{project?.name ?? '—'}</span>
        <div className="flex items-center gap-1">
          <Tooltip content="Tags & links">
            <IconButton aria-label="Tags and links" size="sm" onClick={() => onExtras(service)}>
              <Tags size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Edit">
            <IconButton aria-label="Edit service" size="sm" onClick={() => onEdit(service)}>
              <Pencil size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete">
            <IconButton aria-label="Delete service" size="sm" onClick={() => onDelete(service)}>
              <Trash2 size={13} aria-hidden />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
