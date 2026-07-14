import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Chip, IconButton, Tooltip } from '@shared/ui';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES, type Project } from '@entities/project';

export type ProjectCardProps = {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card className="flex h-full flex-col gap-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/projects/${project.id}`}
          className="truncate text-sm font-semibold text-fg-primary hover:text-accent"
          title={project.name}
        >
          {project.name}
        </Link>
        <Chip tone={PROJECT_STATUS_TONES[project.status]} mono>
          {PROJECT_STATUS_LABELS[project.status]}
        </Chip>
      </div>

      {project.direction ? (
        <span className="font-mono text-xs text-fg-secondary">{project.direction}</span>
      ) : null}

      {project.description ? (
        <p className="line-clamp-2 text-xs text-fg-muted" title={project.description}>
          {project.description}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border-subtle pt-3">
        <span className="font-mono text-[11px] text-fg-muted">
          {project.starts_at ?? '—'} → {project.ends_at ?? '—'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip content="Edit">
            <IconButton aria-label="Edit project" size="sm" onClick={() => onEdit(project)}>
              <Pencil size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete">
            <IconButton aria-label="Delete project" size="sm" onClick={() => onDelete(project)}>
              <Trash2 size={13} aria-hidden />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
