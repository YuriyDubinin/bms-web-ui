import type { DealStatus } from '@app/api';
import { DEAL_STATUS_LABELS, DEAL_STATUS_TONE } from './model';

/** Chip этапа воронки сделки — общий для таблицы и карточек. */
export function StatusChip({ status }: { status: DealStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${DEAL_STATUS_TONE[status]}`}
    >
      {DEAL_STATUS_LABELS[status]}
    </span>
  );
}
