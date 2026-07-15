import type { TaskPriority, TaskStatus } from '@app/api';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONE,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
} from './model';

const chipBase =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium';

/** Chip статуса задачи. */
export function StatusChip({ status }: { status: TaskStatus }) {
  return <span className={`${chipBase} ${TASK_STATUS_TONE[status]}`}>{TASK_STATUS_LABELS[status]}</span>;
}

/** Chip приоритета задачи. */
export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`${chipBase} ${TASK_PRIORITY_TONE[priority]}`}>
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}
