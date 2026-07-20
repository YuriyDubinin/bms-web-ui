import type { ProcessStatus } from '@app/api';
import { PROCESS_STATUS_LABELS, PROCESS_STATUS_TONE } from './model';

/** Chip статуса процесса — общий для таблицы и карточек. */
export function StatusChip({ status }: { status: ProcessStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${PROCESS_STATUS_TONE[status]}`}
    >
      {PROCESS_STATUS_LABELS[status]}
    </span>
  );
}
