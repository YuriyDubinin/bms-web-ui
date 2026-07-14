import { ChevronLeft, ChevronRight, Pencil, Tags, Trash2 } from 'lucide-react';
import { Card, Chip, IconButton, Tooltip } from '@shared/ui';
import {
  KANBAN_COLUMNS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  type Task,
  type TaskStatus,
} from '@entities/task';
import type { User } from '@entities/user';

export type TaskKanbanCardProps = {
  task: Task;
  assignee?: User;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onExtras: (task: Task) => void;
};

function isOverdue(task: Task): boolean {
  if (!task.due_at || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  return new Date(task.due_at).getTime() < Date.now();
}

export function TaskKanbanCard({ task, assignee, onEdit, onDelete, onMove, onExtras }: TaskKanbanCardProps) {
  const idx = KANBAN_COLUMNS.indexOf(task.status);
  const prevStatus = idx > 0 ? KANBAN_COLUMNS[idx - 1] : undefined;
  const nextStatus = idx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[idx + 1] : undefined;

  return (
    <Card className="flex flex-col gap-2 p-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-fg-primary">{task.title}</span>
        <Chip tone={TASK_PRIORITY_TONES[task.priority]} mono className="shrink-0">
          {TASK_PRIORITY_LABELS[task.priority]}
        </Chip>
      </div>

      <div className="flex items-center justify-between font-mono text-[11px] text-fg-muted">
        <span className={isOverdue(task) ? 'text-state-error' : undefined}>
          {task.due_at ? new Date(task.due_at).toLocaleDateString() : '—'}
        </span>
        <span className="truncate">{assignee?.full_name ?? 'Unassigned'}</span>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-2">
        <span className="inline-flex items-center gap-0.5">
          <Tooltip content={prevStatus ? `Move to ${prevStatus}` : 'First column'}>
            <IconButton
              aria-label="Move left"
              size="sm"
              disabled={!prevStatus}
              onClick={() => prevStatus && onMove(task, prevStatus)}
            >
              <ChevronLeft size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content={nextStatus ? `Move to ${nextStatus}` : 'Last column'}>
            <IconButton
              aria-label="Move right"
              size="sm"
              disabled={!nextStatus}
              onClick={() => nextStatus && onMove(task, nextStatus)}
            >
              <ChevronRight size={13} aria-hidden />
            </IconButton>
          </Tooltip>
        </span>
        <span className="inline-flex items-center gap-0.5">
          <Tooltip content="Tags & links">
            <IconButton aria-label="Tags and links" size="sm" onClick={() => onExtras(task)}>
              <Tags size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Edit">
            <IconButton aria-label="Edit task" size="sm" onClick={() => onEdit(task)}>
              <Pencil size={13} aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete">
            <IconButton aria-label="Delete task" size="sm" onClick={() => onDelete(task)}>
              <Trash2 size={13} aria-hidden />
            </IconButton>
          </Tooltip>
        </span>
      </div>
    </Card>
  );
}
