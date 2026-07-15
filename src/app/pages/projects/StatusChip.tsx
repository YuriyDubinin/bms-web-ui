import type { ProjectStatus } from '@app/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from './model';

/** Chip статуса проекта — общий для таблицы, карточек и детальной страницы. */
export function StatusChip({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PROJECT_STATUS_TONE[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
